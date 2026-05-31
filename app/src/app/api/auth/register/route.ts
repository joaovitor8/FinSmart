
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/src/lib/prisma";
import { registerSchema } from "@/src/lib/schemas";
import { seedDefaultCategories } from "@/src/lib/seed";
import { rateLimit, getClientIp } from "@/src/lib/ratelimit";
import { generateToken, hashToken } from "@/src/lib/tokens";
import { sendVerificationEmail } from "@/src/lib/email";

const VERIFICATION_TTL_HOURS = 24;

export async function POST(request: Request) {
  try {
    // Anti criação em massa de contas: limita cadastros por IP
    const limit = await rateLimit(`register:${getClientIp(request)}`, 5, 10 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    // Valida e normaliza payload (zod já faz lowercase/trim no email)
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const { email, password, name } = parsed.data;

    // Email já cadastrado? Em vez de devolver erro (vaza enumeração de contas),
    // simula sucesso. O frontend redireciona pra /login e o usuário descobre lá
    // se a conta era dele (login funciona) ou não.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // Pad de timing: roda um bcrypt.hash descartado pra resposta levar o mesmo
      // tempo do caminho normal — senão o atacante mede o delta e descobre.
      await bcrypt.hash(password, 12);
      return NextResponse.json({ success: true }, { status: 201 });
    }

    // Hash + create + seed + token de verificação numa transação atômica
    const passwordHash = await bcrypt.hash(password, 12);
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);

    const userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });
      await seedDefaultCategories(user.id, tx);
      await tx.emailVerificationToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });
      return user.id;
    });

    // Envia o email FORA da transação (Resend pode falhar — não queremos rollback).
    // Se falhar, o usuário pode pedir reenvio pela tela de configurações.
    try {
      await sendVerificationEmail({ to: email, name, token: rawToken });
    } catch (err) {
      console.error("Falha ao enviar email de verificação:", err);
      // Não falha o cadastro — o usuário consegue entrar e pedir reenvio depois
    }

    void userId;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
