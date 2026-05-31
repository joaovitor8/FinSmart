// Rate limiter distribuído via Upstash Redis (sliding window).
// Funciona corretamente em serverless multi-instância — todas as réplicas
// leem/escrevem no mesmo store.
//
// Em desenvolvimento, se UPSTASH_REDIS_REST_URL/TOKEN não estiverem setados,
// cai num fallback em memória (não distribuído) pra não travar `next dev`.
// Em produção, a ausência das envs lança erro no startup.
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

if (!hasUpstash && process.env.NODE_ENV === "production") {
  throw new Error(
    "UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN são obrigatórios em produção.",
  );
}

// --- Caminho Upstash (produção e dev configurado) ---
const redis = hasUpstash ? Redis.fromEnv() : null;
const limiterCache = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const key = `${limit}:${windowMs}`;
  let limiter = limiterCache.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: "finsmart_rl",
    });
    limiterCache.set(key, limiter);
  }
  return limiter;
}

// --- Fallback em memória (somente dev sem Upstash configurado) ---
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

// Permite `limit` chamadas a cada `windowMs` para uma mesma `key`.
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (!hasUpstash) return memoryRateLimit(key, limit, windowMs);

  const limiter = getUpstashLimiter(limit, windowMs);
  const result = await limiter.limit(key);
  return {
    success: result.success,
    remaining: result.remaining,
    retryAfterSeconds: result.success
      ? 0
      : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}

// Extrai o IP do cliente. PREMISSA: a aplicação roda atrás de um proxy confiável
// (Vercel, Cloudflare, Nginx com `proxy_set_header X-Real-IP $remote_addr`) que
// normaliza esses headers. Sem proxy confiável, qualquer cliente pode mandar
// X-Forwarded-For: <ip qualquer> e bypassar o rate-limit por IP.
//
// Ordem: x-real-ip (proxy seta valor único, não-spoofável) → x-forwarded-for
// (lista cliente,proxy1,proxy2; pegamos o primeiro = cliente original).
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}
