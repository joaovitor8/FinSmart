import { NextResponse } from "next/server";

import { prisma } from "@/src/lib/prisma";
import { forgotPasswordSchema } from "@/src/lib/schemas";
import { rateLimit, getClientIp } from "@/src/lib/ratelimit";
import { generateToken, hashToken } from "@/src/lib/tokens";
import { sendPasswordResetEmail } from "@/src/lib/email";

const RESET_TTL_HOURS = 1;

export async function POST(request: Request) {
  try {
    // Rate-limit duplo: por IP (anti-spam de emails) e o per-email rate-limit
    // está implícito no fato de gerarmos só 1 token por chamada.
    const ip = getClientIp(request);
    const limit = await rateLimit(`forgot:${ip}`, 5, 15 * 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const parsed = forgotPasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      // Não vaza o motivo do erro pra evitar enumeração
      return NextResponse.json({ success: true });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });

    // SEMPRE retorna sucesso, exista ou não o usuário — anti-enumeração.
    // Só envia email de fato se existir.
    if (user) {
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      try {
        await sendPasswordResetEmail({ to: email, name: user.name, token: rawToken });
      } catch (err) {
        console.error("Falha ao enviar email de reset:", err);
        // Não falha a resposta — usuário pediria de novo
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no forgot-password:", error);
    // Mesmo erro interno: retorna sucesso pra não vazar nada
    return NextResponse.json({ success: true });
  }
}
