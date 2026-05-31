"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId, requireSession } from "@/src/lib/auth-server";
import { revokeOtherSessions } from "@/src/lib/sessions";
import { AUTH_COOKIE } from "@/src/lib/cookie-options";
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from "@/src/lib/schemas";

// Atualiza nome e/ou email do usuário.
export async function updateProfile(input: unknown) {
  const userId = await requireUserId();
  const data = updateProfileSchema.parse(input);

  // Email já em uso por outro usuário?
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing && existing.id !== userId) {
    throw new Error("Este email já está em uso");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name: data.name, email: data.email },
  });

  revalidatePath("/main/settings");
  return { name: data.name, email: data.email };
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
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

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
