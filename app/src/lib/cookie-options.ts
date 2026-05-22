// Opções padrão do cookie de auth. Login e logout precisam usar os MESMOS flags
// para o navegador conseguir substituir/expirar o cookie em produção (HTTPS).
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const AUTH_COOKIE = "auth_token";

export const authCookieOptions = (): Partial<ResponseCookie> => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});
