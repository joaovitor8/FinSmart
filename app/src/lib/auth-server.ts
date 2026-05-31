// Helpers de autenticação para uso em Server Components e Server Actions.
import "server-only";
import { cookies } from "next/headers";
import { verifyToken } from "@/src/lib/auth";
import { validateSession } from "@/src/lib/sessions";

// Retorna ID do usuário + da sessão a partir do cookie.
// Faz verificação completa: assinatura JWT + consulta no DB pra confirmar
// que a sessão não foi revogada.
export async function getSession(): Promise<{ userId: string; sessionId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const valid = await validateSession(payload.sessionId, payload.userId);
  if (!valid) return null;

  return { userId: payload.userId, sessionId: payload.sessionId };
}

// Retorna só o userId (compatibilidade com chamadas existentes).
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

// Throw quando não autenticado. Use em Server Actions.
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Não autorizado");
  return userId;
}

// Throw quando não autenticado, mas devolve userId + sessionId.
// Use quando precisar saber qual sessão é a "atual" (ex: ações de gerenciamento de sessões).
export async function requireSession(): Promise<{ userId: string; sessionId: string }> {
  const session = await getSession();
  if (!session) throw new Error("Não autorizado");
  return session;
}
