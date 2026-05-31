// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getSession } from "@/src/lib/auth-server";

export async function GET() {
  // getSession faz a validação completa (JWT + sessão não revogada no DB)
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  // Busca o usuário, mas usa o 'select' para NUNCA trazer o passwordHash para o front-end
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ user });
}
