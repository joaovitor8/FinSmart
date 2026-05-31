// Cliente Resend e templates de email.
import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }
  cached = new Resend(apiKey);
  return cached;
}

function getFrom(): string {
  return process.env.EMAIL_FROM ?? "FinSmart <onboarding@resend.dev>";
}

function getAppUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

// Escapa HTML pra evitar injeção em campos vindos do usuário (nome, etc.)
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e5e5;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:12px;padding:32px;">
    <h1 style="color:#10b981;font-size:24px;margin:0 0 16px 0;">FinSmart</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #262626;margin:32px 0 16px 0;">
    <p style="color:#737373;font-size:12px;margin:0;">
      Se você não solicitou esse email, pode ignorar com segurança.
    </p>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(input: {
  to: string;
  name: string | null;
  token: string;
}): Promise<void> {
  const link = `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Olá, ${esc(input.name)}` : "Olá";

  const html = baseLayout("Confirme seu email", `
    <p style="font-size:16px;margin:0 0 16px 0;">${greeting}!</p>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px 0;">
      Para concluir seu cadastro no FinSmart, confirme seu endereço de email clicando no botão abaixo.
      O link expira em 24 horas.
    </p>
    <a href="${link}" style="display:inline-block;background:#10b981;color:#0a0a0a;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Confirmar email
    </a>
    <p style="font-size:12px;color:#737373;margin:24px 0 0 0;">
      Ou cole esse link no navegador:<br>
      <span style="color:#a3a3a3;word-break:break-all;">${link}</span>
    </p>
  `);

  await getResend().emails.send({
    from: getFrom(),
    to: input.to,
    subject: "Confirme seu email — FinSmart",
    html,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string | null;
  token: string;
}): Promise<void> {
  const link = `${getAppUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = input.name ? `Olá, ${esc(input.name)}` : "Olá";

  const html = baseLayout("Redefinir senha", `
    <p style="font-size:16px;margin:0 0 16px 0;">${greeting}!</p>
    <p style="font-size:14px;color:#a3a3a3;margin:0 0 24px 0;">
      Recebemos um pedido para redefinir a senha da sua conta. Se foi você, clique no botão abaixo.
      O link expira em 1 hora.
    </p>
    <a href="${link}" style="display:inline-block;background:#10b981;color:#0a0a0a;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
      Redefinir senha
    </a>
    <p style="font-size:12px;color:#737373;margin:24px 0 0 0;">
      Ou cole esse link no navegador:<br>
      <span style="color:#a3a3a3;word-break:break-all;">${link}</span>
    </p>
    <p style="font-size:12px;color:#737373;margin:16px 0 0 0;">
      Se não foi você, ignore esse email — sua senha continua a mesma.
    </p>
  `);

  await getResend().emails.send({
    from: getFrom(),
    to: input.to,
    subject: "Redefinir senha — FinSmart",
    html,
  });
}
