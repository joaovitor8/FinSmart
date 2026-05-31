import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions } from "@/src/lib/cookie-options";
import { verifyToken } from "@/src/lib/auth";
import { revokeSession } from "@/src/lib/sessions";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  // Revoga a sessão no DB (best-effort — se o token for inválido, segue limpando cookie)
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      try {
        await revokeSession(payload.sessionId, payload.userId);
      } catch (err) {
        console.error("Erro ao revogar sessão no logout:", err);
      }
    }
  }

  // Mantém os mesmos flags do login pro browser substituir o cookie
  cookieStore.set(AUTH_COOKIE, "", {
    ...authCookieOptions(),
    expires: new Date(0),
  });

  return NextResponse.json({ success: true });
}
