import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/src/lib/prisma";
import { resetPasswordSchema } from "@/src/lib/schemas";
import { rateLimit, getClientIp } from "@/src/lib/ratelimit";
import { hashToken } from "@/src/lib/tokens";

export async function POST(request: Request) {
  try {
    const limit = await rateLimit(`reset:${getClientIp(request)}`, 10, 60 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const parsed = resetPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const { token, newPassword } = parsed.data;

    const tokenHash = hashToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Link inválido ou expirado. Solicite um novo." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Atualiza senha, marca token como usado, revoga TODAS as sessões do usuário
    // (qualquer sessão ativa pré-reset não vale mais — o usuário esqueceu a senha,
    // então é prudente assumir comprometimento).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no reset-password:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
