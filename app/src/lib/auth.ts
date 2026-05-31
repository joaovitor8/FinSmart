import { SignJWT, jwtVerify } from "jose";

// Pega a chave secreta do arquivo .env
const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error("A variável de ambiente JWT_SECRET não está definida.");
  }
  return new TextEncoder().encode(secret);
};

export type SessionPayload = {
  userId: string;
  sessionId: string;
};

// Cria o token de acesso. O JWT carrega o sessionId pra permitir revogação
// (o servidor consulta a tabela Session pra confirmar que a sessão ainda vale).
export async function signToken(userId: string, sessionId: string) {
  const token = await new SignJWT({ userId, sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());

  return token;
}

// Verifica APENAS a assinatura do JWT. NÃO consulta o banco — usado em middleware
// (Edge runtime, sem Prisma). Pra validação completa (sessão não revogada),
// use `getUserId` em auth-server.ts.
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (typeof payload.userId !== "string" || typeof payload.sessionId !== "string") {
      return null;
    }
    return { userId: payload.userId, sessionId: payload.sessionId };
  } catch {
    return null;
  }
}
