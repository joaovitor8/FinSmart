// Cliente Anthropic compartilhado (server-only).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env e reinicie o servidor.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

// Modelo padrão do mentor. Pode ser sobrescrito por env.
export const MENTOR_MODEL = process.env.CLAUDE_MODEL ?? "claude-opus-4-7";
