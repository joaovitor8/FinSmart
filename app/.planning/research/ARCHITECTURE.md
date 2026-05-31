# Architecture Research

**Domain:** Defense-in-depth hardening for Next.js 16 App Router + Prisma 7 personal-finance app
**Researched:** 2026-05-31
**Confidence:** HIGH — Next.js 16.2.6 official docs verified by researcher; cross-referenced with FinSmart codebase docs and live `src/proxy.ts`.

## Critical Discovery (overrides CONCERNS.md)

CONCERNS.md says "no `middleware.ts` found." That is technically true but misses the new fact: **Next.js 16.0.0 renamed `middleware.ts` → `proxy.ts`**. FinSmart already has `src/proxy.ts` (verified 2026-05-31), and it already handles auth check, CSP nonce in production, public-route whitelist, and matcher exclusion of static assets.

Implication for this milestone: phases that say "create middleware" should be rewritten as **"expand `src/proxy.ts`"**. The header coverage is partial — HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options are missing — and `connect-src` does not allow Anthropic/Upstash hosts the app needs.

Source: Next.js 16 file convention reference (verified by researcher at <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>, updated 2026-05-28).

## Standard Architecture (Defense in Depth)

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  L0 — Platform / build                                            │
│  • next.config.ts headers()  (static: HSTS, XFO, RP, P-P, X-CTO)  │
│  • src/lib/env.ts (zod boot-time validation; fail at module load) │
├──────────────────────────────────────────────────────────────────┤
│  L1 — Proxy  (src/proxy.ts; Node runtime by default in v16)       │
│  • Cookie presence + JWT signature verify (jose)                  │
│  • Public/auth-route redirects                                    │
│  • CSP **nonce** generation (per-request, prod only)              │
│  • IP rate-limit for /api/auth/* (NEW — currently per-route)      │
│  • Trusted-proxy detection for x-forwarded-for (NEW)              │
├──────────────────────────────────────────────────────────────────┤
│  L2 — Layout guard  (src/app/main/layout.tsx, Server Component)   │
│  • Full session validation: JWT + Prisma Session.findFirst()      │
│  • Redirect to /login on revoked session                          │
├──────────────────────────────────────────────────────────────────┤
│  L3 — DAL + Server Actions  (NEW src/lib/dal/* + actions/*)       │
│  • requireUserId() + zod parse                                    │
│  • Ownership checks centralized in DAL                            │
│  • Per-user rate-limit (Mentor already does this)                 │
│  • revalidatePath after mutations                                 │
├──────────────────────────────────────────────────────────────────┤
│  L4 — API Routes  (src/app/api/auth/*)                            │
│  • CSRF token (double-submit cookie) — NEW                        │
│  • zod parse, bcrypt timing-safe compare                          │
│  • Email/reset flows                                              │
├──────────────────────────────────────────────────────────────────┤
│  L5 — Prisma extensions  (NEW src/lib/prisma-audit.ts + guards)   │
│  • $extends({ query }) for AuditLog on update/delete              │
│  • $extends({ query }) dev warn if "ownable" model lacks userId   │
│  • userId propagated via AsyncLocalStorage from authedAction      │
├──────────────────────────────────────────────────────────────────┤
│  L6 — PostgreSQL                                                  │
│  • Schema: @@unique([userId, categoryId]) on Budget (fix)         │
│  • FK integrity; encrypted at rest by managed host                │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/proxy.ts` (L1) | Cheap reject before page/action runs; CSP nonce; IP rate limit | Next.js proxy file convention (v16) — Node runtime default |
| `src/app/main/layout.tsx` (L2) | Server-side session validation per page load | RSC reading cookies + Prisma `Session.findFirst({ revokedAt: null })` |
| `src/lib/auth-server.ts` (L3 helper) | `requireUserId()` + new `authedAction()` wrapper | Throws if no session; wraps action with zod + ALS userId |
| `src/lib/dal/*` (NEW, L3) | Authoritative DB access functions taking `userId` explicitly | `server-only` modules using Prisma; ownership baked in |
| `src/lib/actions/*` (L3) | Thin wrappers: validate, delegate to DAL, revalidate | Use `authedAction()` HOF; no Prisma direct |
| `src/app/api/auth/*` (L4) | Login/register/password flows with CSRF | Route handlers; manual Origin check or `@edge-csrf/nextjs` |
| `src/lib/prisma-audit.ts` (NEW, L5) | Audit log write on every mutation | Prisma `$extends({ query: { transaction: { update, delete }, ... } })` |
| `src/lib/env.ts` (NEW, L0) | Boot-time env validation | `@t3-oss/env-nextjs` + zod |

## Recommended Project Structure (delta to FinSmart)

```
src/
├── proxy.ts                            # [EXPAND] cookie+JWT sig + CSP nonce + IP rate-limit + trusted proxy
├── lib/
│   ├── env.ts                          # NEW: zod-validated env (T3)
│   ├── csrf.ts                         # NEW: double-submit token helpers for /api/auth/*
│   ├── totp.ts                         # NEW: otplib helpers (setup/verify/recovery)
│   ├── password-strength.ts            # NEW: zxcvbn-ts wrapper with pt-BR pack
│   ├── auth-server.ts                  # [EXPAND] add authedAction() + ALS userId propagation
│   ├── prisma.ts                       # [ALTER] apply $extends (audit + guards)
│   ├── prisma-audit.ts                 # NEW: $extends.query audit log
│   ├── prisma-guards.ts                # NEW: $extends.query warn-if-missing-userId (dev only)
│   ├── ratelimit.ts                    # [EXPAND] expose rateLimitIp() callable from proxy
│   ├── dal/                            # NEW: Data Access Layer (Next.js 16 official pattern)
│   │   ├── session.ts                  # cached(getCurrentUser)
│   │   ├── transactions.ts
│   │   ├── categories.ts
│   │   ├── budgets.ts
│   │   ├── goals.ts
│   │   └── monthlyFees.ts
│   └── actions/                        # [REFACTOR] thin actions: zod + delegate to DAL + revalidate
│       └── twofa.ts                    # NEW: enable / disable / recovery codes (Server Actions)
├── app/api/
│   ├── auth/
│   │   ├── login/route.ts              # [ALTER] support 2FA challenge (partialToken when 2FA required)
│   │   └── twofa-verify/route.ts       # NEW: verify TOTP, mint full session
│   └── cron/cleanup-tokens/route.ts    # NEW: Vercel Cron expired-token sweep
├── prisma/schema.prisma                # [ALTER] @@unique([userId, categoryId]) on Budget;
│                                       # NEW: AuditLog model; User.twoFactorEnabled, TwoFactorSecret, RecoveryCode[]
├── env.d.ts                            # NEW or augmented: env types
└── __tests__/                          # NEW (root-of-src — integration, not co-located)
    ├── isolation.test.ts
    ├── ratelimit.test.ts
    ├── session.test.ts
    ├── decimal.test.ts
    ├── csrf.test.ts
    └── twofa.test.ts
```

### Structure Rationale

- **`src/lib/dal/`** is the single highest-leverage refactor. Extracting auth+ownership out of `src/lib/actions/*` centralizes IDOR prevention and gives the audit-log extension a stable place to read `userId` from AsyncLocalStorage.
- **`src/__tests__/`** at root of `src/` (not co-located): hardening tests are integration (action → DAL → Postgres), not unit. Co-locating mixes layers.
- **`prisma-audit.ts` separate from `prisma-guards.ts`**: audit is prod-on, guards are dev-only (warn-if-missing-userId in `where` clauses). Splitting lets either be disabled independently.

## Architectural Patterns

### Pattern 1: `authedAction` higher-order function

**What:** Wraps a Server Action with `requireUserId()`, zod parse, optional per-user rate limit, and `revalidatePath`. Propagates `userId` through AsyncLocalStorage so Prisma extensions can read it.

**When to use:** Every Server Action in `src/lib/actions/*` that requires authentication. Eliminates the "forgot to call `requireUserId()`" failure mode.

**Trade-offs:**
- ✅ Impossible to forget auth — wrap or it doesn't compile typed
- ✅ Audit log gets `userId` automatically
- ⚠️ Extra abstraction; readers must learn one wrapper
- ⚠️ ALS adds tiny per-request cost (negligible)

**Example:**
```ts
// src/lib/auth-server.ts
export function authedAction<S extends z.ZodType, R>(
  schema: S,
  handler: (ctx: { userId: string }, input: z.infer<S>) => Promise<R>,
  opts?: { revalidate?: string[]; rateLimit?: { max: number; windowSec: number } },
) {
  return async (input: unknown): Promise<R> => {
    const userId = await requireUserId();
    const data = schema.parse(input);
    if (opts?.rateLimit) await checkUserRateLimit(userId, opts.rateLimit);
    const result = await auditContext.run({ userId }, () => handler({ userId }, data));
    opts?.revalidate?.forEach(revalidatePath);
    return result;
  };
}

// usage in src/lib/actions/transactions.ts
export const createTransaction = authedAction(
  createTransactionSchema,
  async ({ userId }, data) => dal.createTransactionForUser(userId, data),
  { revalidate: ["/main/transactions", "/main/dashboard"] },
);
```

### Pattern 2: DAL with `cache()` (Next.js 16 official)

**What:** Server-only modules that take `userId` explicitly, do ownership checks, and use React's `cache()` to dedupe within a request.

**When to use:** Any Prisma read/write touching ownable models. Replaces inline Prisma calls in actions and Server Components.

**Trade-offs:**
- ✅ Ownership check is "build-in" — IDOR impossible if you go through DAL
- ✅ `cache()` dedupes within a request (multiple components reading transactions hit DB once)
- ⚠️ One more layer to navigate

**Example:**
```ts
// src/lib/dal/transactions.ts
import "server-only";
import { cache } from "react";
import { prisma } from "@/src/lib/prisma";

export const listTransactionsForUser = cache(async (userId: string) =>
  prisma.transaction.findMany({ where: { userId }, orderBy: { date: "desc" } })
);

export async function createTransactionForUser(userId: string, data: TransactionInput) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new Error("Categoria inválida"); // IDOR prevention
  return prisma.transaction.create({ data: { ...data, userId } });
}
```

### Pattern 3: Proxy as "cheap reject"

**What:** `src/proxy.ts` does the cheapest possible rejection (cookie presence, JWT signature, IP rate limit, CSP nonce). Real authorization stays in L2/L3.

**When to use:** Always. Per Next.js 16 docs: *"Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone."*

**Trade-offs:**
- ✅ Defense in depth — multiple layers catch the same class of bug
- ⚠️ Slight duplication (JWT signature checked twice)
- ⚠️ Matcher mistakes can silently drop a layer — must be reviewed when paths change

**Example (delta to current `src/proxy.ts`):**
```ts
// 1. Move IP rate limit here from per-route handlers
if (path.startsWith("/api/auth/")) {
  const allowed = await rateLimitIp(request, { max: 10, windowSec: 60 });
  if (!allowed) return new NextResponse("Too many requests", { status: 429 });
}

// 2. Expand connect-src so Mentor and Upstash work under CSP
"connect-src 'self' https://api.anthropic.com https://*.upstash.io",

// 3. Add the missing static headers in next.config.ts (NOT here — those are static)
```

## Data Flow

### Request flow (mutation)

```
[Click "Salvar transação"]
    ↓
[React form, react-hook-form + zod]
    ↓ (POST, Server Action, built-in CSRF check by Next.js)
[src/proxy.ts]  ← cookie + JWT sig + CSP nonce
    ↓
[src/lib/actions/transactions.createTransaction]  (wrapped by authedAction)
    ↓                                              ↓
[zod parse]                          [AsyncLocalStorage { userId }]
    ↓
[src/lib/dal/transactions.createTransactionForUser]
    ↓ (ownership check)                            ↓
[Prisma client with $extends]    → reads ALS, writes AuditLog
    ↓
[PostgreSQL]
    ↑
[revalidatePath('/main/transactions','/main/dashboard')]
    ↑
[RSC re-render, return new HTML / data]
```

### Auth flow (login with 2FA)

```
[POST /api/auth/login]  (Origin/Referer CSRF check)
    ↓
[rate limit per IP from proxy already enforced]
    ↓
[bcrypt compare]  → fail → 401 (no enumeration)
    ↓
[fetch user.twoFactorEnabled]
    ↓
   ┌── no 2FA ──→  [mint full JWT, set cookie, log session]
   └── 2FA ─────→  [mint short-lived "partial" JWT, return { requires2fa: true, partialToken }]
                       ↓
                    [POST /api/auth/twofa-verify]
                       ↓
                    [otplib.authenticator.verify(token, secret)]
                       ↓
                    [mint full JWT, set cookie, log session]
```

### Key data flows

1. **Audit log write:** Prisma extension intercepts `transaction.update/delete` (and budgets/goals/monthlyFees). Reads old row, runs the mutation, writes `AuditLog` row in the SAME `prisma.$transaction([...])` — otherwise failed mutations leave audit rows. Uses `userId` from AsyncLocalStorage.
2. **CSP nonce propagation:** `src/proxy.ts` generates nonce per request, sets `x-nonce` header on the request, layout reads via `headers().get("x-nonce")`, passes to `<script>` tags and `<ThemeProvider nonce={...}>`.
3. **Trusted-proxy IP extraction:** `src/lib/ratelimit.ts#getClientIp()` only reads `x-forwarded-for` when `process.env.VERCEL === "1"` or `TRUSTED_PROXY === "true"`. Otherwise falls back to socket IP. Boot-time warn if production + no proxy signal.

## Build Order with Dependency Reasoning

```
A — FOUNDATION (blocks everything)
   • src/lib/env.ts validation + Vitest setup + integration test DB
   • Schema fix: @@unique([userId, categoryId]) on Budget
   • DAL skeleton (one feature end-to-end as proof)
   • First isolation test (proves the constraint works)

B — PROXY HARDENING (depends on A: needs env validated to use JWT_SECRET)
   • Expand src/proxy.ts: move IP rate-limit from per-route, expand CSP connect-src
   • Add static headers in next.config.ts: HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options
   • Trusted-proxy detection in ratelimit.getClientIp()

C — API AUTH HARDENING (parallelizable with B)
   • CSRF tokens on /api/auth/* (or Origin/Referer check)
   • Replace COMMON_PASSWORDS with zxcvbn-ts (pt-BR pack) in src/lib/schemas.ts

D — COMPLETE DAL + AUTH WRAPPER (depends on A)
   • Extract all actions → DAL functions
   • authedAction() wrapper everywhere
   • Ownership checks centralized in DAL
   • Goal progress upper-bound (server-side reject newCurrent > target)
   • Tests: isolation across ALL features, decimal precision, rate limit, session revocation

E — AUDIT LOG (depends on D: needs userId in AsyncLocalStorage)
   • AuditLog model in schema
   • src/lib/prisma-audit.ts with $extends.query
   • AsyncLocalStorage propagation in authedAction
   • Tests: audit row written on update/delete; not written on rollback

F — TOKEN CLEANUP CRON (independent — parallelizable from A onward)
   • src/app/api/cron/cleanup-tokens/route.ts
   • vercel.json with schedule + CRON_SECRET

G — 2FA (depends on D + E: needs solid DAL + audit before adding new auth flow)
   • Schema: TwoFactor + RecoveryCode models or columns on User
   • src/lib/totp.ts (otplib)
   • Settings UI: enroll, view recovery codes, disable (re-auth required)
   • Login flow rework: partialToken → /api/auth/twofa-verify

H — DOCS + REGRESSION
   • SECURITY.md with threat model + deployment requirements (trusted proxy, CRON_SECRET, env vars)
   • Regression tests across all hardening areas
```

Critical ordering invariants (do NOT invert):
- `A → B` — proxy expansion needs `JWT_SECRET` validated and DB constraint stable
- `A → D` — DAL assumes the schema fix
- `D → E` — audit needs `userId` from `authedAction` context
- `A → G` — 2FA needs everything else sound first (don't add auth flow to a leaky base)

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (current) | Monolith fine. Upstash for rate limit; managed PG. Audit log in same DB. |
| 1k–10k users | Connection pool tuning (`connection_limit` in Prisma URL or PgBouncer). Audit log table partitioned monthly. CDN cache for static assets. |
| 10k+ users | Audit log to separate DB or events stream (Kinesis/Kafka). Read replicas for reports. Possibly Vercel Pro plan. |

### Scaling Priorities

1. **First bottleneck:** Prisma default pool (10 connections) under concurrent load. Fix: set `connection_limit` in DATABASE_URL.
2. **Second bottleneck:** Audit log table growth — index `(userId, at DESC)` for "my history" queries; partition by month at 100k+ rows.

## Anti-Patterns

### Anti-Pattern 1: Postgres RLS with Prisma 7

**What people do:** Try to use Postgres Row-Level Security with `SET LOCAL app.user_id` per-request.

**Why it's wrong:** Prisma 7 has no native support; the workaround is fragile, breaks query cache, and adds latency. Most Prisma+RLS attempts end up half-broken.

**Do this instead:** DAL with explicit `userId` in every `where`, plus `@@unique([userId, X])` constraints, plus Prisma `$extends` dev-warn for missing `userId`. Layered, debuggable, no per-request DB session state.

### Anti-Pattern 2: Authorization in proxy

**What people do:** Check resource ownership in `src/proxy.ts` ("user can access `/main/transactions/123` only if owns 123").

**Why it's wrong:** Next.js 16 docs explicitly forbid: *"Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone."* Matcher changes can silently drop the check.

**Do this instead:** Proxy does cheap reject (cookie + signature). Layout does session validation. DAL does ownership.

### Anti-Pattern 3: CSRF token in Server Actions

**What people do:** Add explicit CSRF tokens to forms calling Server Actions.

**Why it's wrong:** Server Actions already have 3-layer protection (POST-only, Origin==Host check, encrypted non-deterministic action IDs rotated per build). Adding tokens is redundant and confuses readers.

**Do this instead:** CSRF tokens only on `/api/auth/*` POST handlers. Leave Server Actions alone.

### Anti-Pattern 4: DB triggers for audit log

**What people do:** Postgres triggers writing to an audit table.

**Why it's wrong:** No `userId` context (triggers run in DB role, not user role). Not synced with Prisma migrations. No stack trace. Vercel Postgres doesn't expose `pg_audit`.

**Do this instead:** Prisma `$extends({ query })` extension with userId from AsyncLocalStorage.

### Anti-Pattern 5: `localStorage` for TOTP secret during setup

**What people do:** Store the secret client-side until user confirms with a code.

**Why it's wrong:** XSS = total bypass. Defeats the purpose of 2FA.

**Do this instead:** Store as `User.twoFactorSecretPending` (encrypted at-rest if possible). Promote to `twoFactorSecret` only after first successful TOTP verification. Reject login until verified.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Claude | Server-only call from `src/lib/actions/mentor.ts` | Add `https://api.anthropic.com` to CSP `connect-src`. Per-user rate limit at L3. Validate key at boot (L0). |
| Resend (email) | Server-only call from API auth routes | No CSP impact (server-to-server). Add retry/queue if scale increases. |
| Upstash Redis | Server-only call from `src/lib/ratelimit.ts` | Add `https://*.upstash.io` to CSP `connect-src` only if any client-side use (currently none). Production startup check that env vars exist. |
| Vercel Cron | Inbound `POST /api/cron/cleanup-tokens` | Auth via `CRON_SECRET` header (Vercel injects). Reject other origins. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Proxy ↔ Server Components | Header propagation (`x-nonce`) | Layout reads via `headers().get("x-nonce")`; passes to scripts/ThemeProvider |
| Server Action ↔ DAL | Direct function call (same process) | DAL is `'server-only'`; actions thin wrappers |
| DAL ↔ Prisma | `$extends` query interception | AuditLog write inside same `$transaction` as the mutation |
| Action ↔ Prisma extension | AsyncLocalStorage (`auditContext`) | Required for audit log to know who is acting |

## Data Flow Leaks Today (where defense-in-depth is currently shallow)

| Leak | Missing layer | Phase to fix |
|------|---------------|--------------|
| Brute-force on login hits the action before IP rejection | L1 (proxy rate limit) | B |
| No CSRF on `/api/auth/*` — only SameSite=Strict | L4 | C |
| `connect-src` blocks Anthropic if CSP turns on in dev (currently dev-only off) | L1 | B |
| UPDATE on Transaction silently loses old value | L5 (audit) | E |
| Multi-tenant isolation never tested | L3 + tests | A then D |
| `@@unique([categoryId])` allows cross-user conflict on cleanup | L6 | A |
| `addToGoalProgress` accepts amount > target (known bug in CONCERNS.md) | L3 | D |
| Verification/reset tokens accumulate forever | L5 / cron | F |
| Email compromise = account takeover | L3 + L4 (2FA) | G |
| `JWT_SECRET` missing = silent failure on first protected call | L0 | A |
| Static headers (HSTS, X-Frame-Options, etc.) missing in production | L0 | B |
| `x-forwarded-for` spoof risk when not behind trusted proxy | L1 | B |

## Test Architecture Recommendation

- **Location:** `src/__tests__/` at the root of `src/` — NOT co-located. Hardening tests are integration (action → DAL → DB).
- **DB strategy:** real Postgres on separate port (docker-compose `pnpm test:db:up`). NOT mocked Prisma — the whole point is testing the DB actually enforces isolation. Mocking only verifies `where: { userId }` was passed.
- **Reset strategy:** wrap each test in a transaction that rolls back, OR `prisma db push --force-reset` per suite. The former is faster.
- **Connection cleanup:** `await prisma.$disconnect()` in `afterAll` or Vitest hangs.
- **Playwright:** SKIP for this milestone. Scope is dev-local, no users; cost/benefit poor for solo dev. Add when deploying.
- **Per-phase test gates:** every phase includes a Vitest section in PLAN.md; the verifier checks tests pass.

## Sources

- Next.js 16 Proxy reference (v16.2.6, updated 2026-05-28) — <https://nextjs.org/docs/app/api-reference/file-conventions/proxy>
- Next.js 16 Data Security guide — <https://nextjs.org/docs/app/guides/data-security>
- Next.js 16 CSP guide — <https://nextjs.org/docs/app/guides/content-security-policy>
- FinSmart codebase docs read: `.planning/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,CONCERNS}.md`
- FinSmart source: `src/proxy.ts` read 2026-05-31 (verified existing CSP nonce + auth check)

## Open Questions (for later phases)

- Deploy target: Vercel Cron vs system cron for Phase F? Affects shared-secret handling.
- `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` — needed for solo-dev single-instance? Probably not; document.
- Connection pool tuning — Phase A or deferred? Currently deferred to scaling milestone.

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Layer-by-layer mapping | HIGH | Verified against Next.js 16.2.6 official docs |
| `proxy.ts` is the v16 middleware | HIGH | Verified by file inspection + docs |
| Build order | HIGH | Dependencies derived from concrete code constraints |
| File paths in FinSmart | HIGH | Cross-referenced with `STRUCTURE.md` and `ARCHITECTURE.md` |
| Prisma extension audit pattern | MEDIUM | `$extends.query` API exists in Prisma 5+; exact syntax may need fact-check at implementation |
| AsyncLocalStorage through Server Actions | MEDIUM | Expected behavior; smoke-test in Phase E before relying on it |
| `otplib` Next.js 16 compat | MEDIUM | Standard choice but not verified against Node 22 / Next 16 in this session |

---
*Architecture research for: FinSmart security hardening*
*Researched: 2026-05-31*
