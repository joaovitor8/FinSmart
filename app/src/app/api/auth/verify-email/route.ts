import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { hashToken } from "@/src/lib/tokens";
import { rateLimit, getClientIp } from "@/src/lib/ratelimit";

// GET porque o link no email é clicável. Sucesso/erro redireciona pra /login
// com query param indicando o resultado (a página mostra um toast).
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Tokens são 256 bits aleatórios — brute force é impraticável, mas o rate-limit
  // por IP evita pegada gratuita no DB e abuso de redirect.
  const limit = await rateLimit(`verify-email:${getClientIp(request)}`, 30, 60 * 60_000);
  if (!limit.success) {
    return NextResponse.redirect(new URL("/login?verified=invalid", url.origin));
  }

  const rawToken = url.searchParams.get("token");

  if (!rawToken) {
    return NextResponse.redirect(new URL("/login?verified=invalid", url.origin));
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?verified=expired", url.origin));
  }

  // Marca token como usado + carimba emailVerifiedAt no usuário (transação)
  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    }),
  ]);

  return NextResponse.redirect(new URL("/login?verified=ok", url.origin));
}
