"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/src/lib/auth-server";
import {
  listSessions as listSessionsDb,
  revokeSession as revokeSessionDb,
  revokeOtherSessions as revokeOtherSessionsDb,
  type SessionDTO,
} from "@/src/lib/sessions";

// Lista as sessões ativas do usuário, marcando qual é a atual.
export async function listSessions(): Promise<SessionDTO[]> {
  const { userId, sessionId } = await requireSession();
  return listSessionsDb(userId, sessionId);
}

// Revoga uma sessão específica. Não permite revogar a sessão atual aqui —
// pra deslogar a sessão atual, o usuário usa o botão "Sair" normal.
export async function revokeSession(id: string) {
  const { userId, sessionId } = await requireSession();
  if (id === sessionId) {
    throw new Error("Use o botão 'Sair' para encerrar a sessão atual");
  }
  await revokeSessionDb(id, userId);
  revalidatePath("/main/settings");
}

// Revoga todas as outras sessões (mantém a atual).
export async function revokeOtherSessions(): Promise<{ revoked: number }> {
  const { userId, sessionId } = await requireSession();
  const revoked = await revokeOtherSessionsDb(userId, sessionId);
  revalidatePath("/main/settings");
  return { revoked };
}
