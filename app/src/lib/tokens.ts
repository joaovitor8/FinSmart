// Geração e hash de tokens (verificação de email, reset de senha).
// O token cru vai no link do email; só o hash (sha256) toca o DB.
// Se o DB vazar, atacante não consegue reusar tokens.
import "server-only";
import { randomBytes, createHash } from "crypto";

// Gera 32 bytes aleatórios em base64url (URL-safe). ~43 chars.
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// Hash sha256 do token. Mesmo input → mesmo hash, então dá pra buscar no DB.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
