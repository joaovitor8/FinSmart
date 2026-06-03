"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId, requireSession } from "@/src/lib/auth-server";
import { revokeOtherSessions } from "@/src/lib/sessions";
import { AUTH_COOKIE } from "@/src/lib/cookie-options";
import { generateToken, hashToken } from "@/src/lib/tokens";
import { sendVerificationEmail } from "@/src/lib/email";
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from "@/src/lib/schemas";

const VERIFICATION_TTL_HOURS = 24;

// Atualiza nome e/ou email do usuário.
// Se o email mudou: reseta emailVerifiedAt, invalida tokens de verificação
// pendentes e dispara nova verificação. Sem isso, atacante verifica um email
// próprio e depois aponta a conta para um email que ele não controla,
// mantendo o "selo verificado" indevidamente.
export async function updateProfile(input: unknown) {
  const userId = await requireUserId();
  const data = updateProfileSchema.parse(input);

  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!current) throw new Error("Usuário não encontrado");

  const emailChanged = current.email !== data.email;

  if (emailChanged) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) {
      throw new Error("Este email já está em uso");
    }
  }

  let rawVerificationToken: string | null = null;

  if (emailChanged) {
    rawVerificationToken = generateToken();
    const tokenHash = hashToken(rawVerificationToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    await prisma.$transaction([
      // Marca como usados os tokens de verificação ainda pendentes — o link
      // antigo (do email anterior) não vale mais.
      prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { name: data.name, email: data.email, emailVerifiedAt: null },
      }),
      prisma.emailVerificationToken.create({
        data: { userId, tokenHash, expiresAt },
      }),
    ]);
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });
  }

  if (emailChanged && rawVerificationToken) {
    try {
      await sendVerificationEmail({
        to: data.email,
        name: data.name,
        token: rawVerificationToken,
      });
    } catch (err) {
      // Não falha a action — o usuário pode pedir reenvio na tela de settings
      console.error("Falha ao enviar email de verificação após troca:", err);
    }
  }

  revalidatePath("/main/settings");
  return { name: data.name, email: data.email, emailChanged };
}

// Troca senha exigindo a senha atual. Revoga TODAS as outras sessões pra que
// dispositivos com cookies antigos sejam deslogados imediatamente.
export async function changePassword(input: unknown) {
  const { userId, sessionId } = await requireSession();
  const data = changePasswordSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado");

  const ok = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!ok) throw new Error("Senha atual incorreta");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);

  // Atomicamente: troca a senha e marca tokens de reset pendentes como usados.
  // Se a troca foi por suspeita de comprometimento, qualquer link de reset
  // ainda em circulação (caixa de email da vítima) deixa de funcionar.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  // Mantém a sessão atual ativa, derruba as outras
  await revokeOtherSessions(userId, sessionId);
}

// Exclui a conta e tudo associado (FKs cascade no schema). Limpa cookie.
export async function deleteAccount(input: unknown) {
  const userId = await requireUserId();
  const data = deleteAccountSchema.parse(input);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuário não encontrado");

  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new Error("Senha incorreta");

  // onDelete: Cascade em User remove tudo (sessões, categorias, transactions, budgets, fees, goals)
  await prisma.user.delete({ where: { id: userId } });

  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
