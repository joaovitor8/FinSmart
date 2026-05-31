// Helpers de gestão de sessões. Cria, valida, revoga.
import "server-only";
import { prisma } from "@/src/lib/prisma";

// Cap de tamanho pra evitar abuso (UA pode ser arbitrário)
function truncate(s: string | null | undefined, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

export async function createSession(input: {
  userId: string;
  userAgent: string | null;
  ip: string | null;
}): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId: input.userId,
      userAgent: truncate(input.userAgent, 500),
      ip: truncate(input.ip, 64),
    },
    select: { id: true },
  });
  return session.id;
}

// Confirma que a sessão existe, pertence ao usuário e não foi revogada.
// Atualiza lastUsedAt periodicamente (no máximo 1x a cada 5min por sessão)
// pra não martelar o DB em toda request.
const TOUCH_INTERVAL_MS = 5 * 60_000;

export async function validateSession(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { userId: true, revokedAt: true, lastUsedAt: true },
  });

  if (!session) return false;
  if (session.userId !== userId) return false;
  if (session.revokedAt) return false;

  // Touch lazy
  const now = Date.now();
  if (now - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastUsedAt: new Date(now) },
    });
  }

  return true;
}

export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  // updateMany pra garantir que só revoga se for do dono (não throw se não achar)
  await prisma.session.updateMany({
    where: { id: sessionId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// Revoga todas as sessões do usuário EXCETO a passada (útil pro botão
// "encerrar outras sessões" e pra trocar senha — mantém o usuário logado
// no dispositivo atual mas desloga todos os outros).
export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      NOT: { id: keepSessionId },
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

export type SessionDTO = {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
};

export async function listSessions(
  userId: string,
  currentSessionId: string,
): Promise<SessionDTO[]> {
  const sessions = await prisma.session.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastUsedAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ip: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  return sessions.map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    current: s.id === currentSessionId,
  }));
}
