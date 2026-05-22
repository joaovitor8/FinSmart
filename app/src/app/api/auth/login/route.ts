import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import { signToken } from "@/src/lib/auth";
import { loginSchema } from "@/src/lib/schemas";
import { AUTH_COOKIE, authCookieOptions } from "@/src/lib/cookie-options";

export async function POST(request: Request) {
  try {
    // Valida payload
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Busca usuário
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Confere senha
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Gera JWT e seta cookie
    const token = await signToken(user.id);
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      ...authCookieOptions(),
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
