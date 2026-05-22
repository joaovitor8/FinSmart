// Helpers de autenticação para uso em Server Components e Server Actions.
import "server-only";
import { cookies } from "next/headers";
import { verifyToken } from "@/src/lib/auth";

// Retorna o ID do usuário logado a partir do cookie. Null se não autenticado.
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// Mesma coisa, mas joga erro. Use dentro de Server Actions que exigem login.
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Não autorizado");
  return userId;
}
