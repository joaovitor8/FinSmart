import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import { prisma } from "@/src/lib/prisma";
import { signToken } from "@/src/lib/auth";
import { createSession } from "@/src/lib/sessions";
import { loginSchema } from "@/src/lib/schemas";
import { AUTH_COOKIE, authCookieOptions } from "@/src/lib/cookie-options";
import { rateLimit, getClientIp } from "@/src/lib/ratelimit";

// Hash dummy lazy: bcrypt.compare contra ele leva o MESMO tempo do caminho
// normal. Sem isso, ataque de timing detecta se o email existe (resposta
// rápida quando não existe, ~200ms quando existe). Computa só na primeira
// chamada e cacheia no closure do módulo.
let dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!dummyHash) {
    dummyHash = await bcrypt.hash("never-used-timing-pad", 12);
  }
  return dummyHash;
}

export async function POST(request: Request) {
  try {
    // Anti brute force: limita tentativas de login por IP
    const ip = getClientIp(request);
    const limit = await rateLimit(`login:${ip}`, 5, 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas de login. Aguarde um momento e tente novamente." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    // Valida payload
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Busca usuário
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Pad de timing: roda um bcrypt.compare descartado pra resposta levar o
      // mesmo tempo do caminho com usuário existente.
      await bcrypt.compare(password, await getDummyHash());
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Confere senha
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Cria sessão (registra IP + user agent pra UI de "suas sessões")
    const sessionId = await createSession({
      userId: user.id,
      userAgent: request.headers.get("user-agent"),
      ip,
    });

    // Gera JWT com userId + sessionId e seta cookie
    const token = await signToken(user.id, sessionId);
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
