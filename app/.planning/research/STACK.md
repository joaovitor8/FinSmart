# Stack Research

**Domain:** Personal finance app security hardening (Next.js 16 + Prisma 7 + custom JWT)
**Researched:** 2026-05-31
**Confidence:** MEDIUM — versions below come from researcher training data (cutoff Jan 2026); verify with `npm view` before locking pins.

## Recommended Stack

### Core Technologies (to add)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@t3-oss/env-nextjs` | `^0.13.x` | Boot-time validation of env vars via zod | Already use zod; fails the build/boot if `JWT_SECRET`, `DATABASE_URL`, etc. are missing or malformed. Replaces silent runtime failures (Anthropic key bug flagged in CONCERNS). |
| `@zxcvbn-ts/core` + `language-common` + `language-pt-br` | `^3.0.x` | Password entropy with Brazilian-Portuguese dictionary | Replaces the hardcoded 40-password list in `src/lib/schemas.ts`. Catches "joao2026"-style passwords by also accepting `userInputs` (email, name). |
| `otplib` | `^12.0.1` | TOTP 2FA (Google Authenticator / Authy compatible) | Live, maintained TOTP lib. `speakeasy` and `node-2fa` are dead. Works in Node and Edge. |
| `qrcode` + `@types/qrcode` | `^1.5.x` | Render TOTP enrollment QR codes | Server-render to data URL, embed in 2FA enrollment page. |
| `decimal.js` | `^10.5.x` | Precise sums for KPIs / reports / dashboards | Prisma's `Decimal` IS `decimal.js`. Reuse it for in-app `reduce()` sums to avoid float drift. |
| `server-only` | `^0.0.1` | Compile-time guard on server-only modules | Prevents `src/lib/auth-server.ts` / `src/env.ts` from bundling into client. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@edge-csrf/nextjs` | `^2.x` | CSRF tokens for API Routes | Only if manual `Origin`/`Referer` check proves insufficient for `/api/auth/*`. Server Actions already CSRF-safe. Verify Next.js 16 compat before adopting. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` | Unit + integration tests | Choice: HIGH; major version (3 vs 4) pending verification. Use `vite-tsconfig-paths` for `@/*` alias. |
| `@vitest/coverage-v8` | Coverage reports | Plug-and-play with Vitest. |
| `@testing-library/react` + `jest-dom` + `jsdom` | Component tests | For client components — minimal need in this milestone; mainly Server Action tests. |
| `playwright` + `@playwright/test` | E2E auth/2FA/isolation flows | Run against a local dev server with seed data. Scope: only auth and security-critical flows. |

### Keep (do NOT replace)

| Library | Current | Why keep |
|---------|---------|----------|
| `jose` | 6.2.3 | Works in Edge middleware, fast. Do not swap for `jsonwebtoken` (Node-only). |
| `bcryptjs` | 3.0.3 | Working. **Pin exact** (drop the `^`) — caret allows breaking 4.x bumps. |
| `@upstash/ratelimit` + `@upstash/redis` | 2.0.8 / 1.38.0 | Working. Only patch `getClientIp` to detect trusted proxy. |
| `zod` | 4.4.3 | Already powers schemas; T3 env piggybacks on it. |

## Installation

```bash
# Runtime additions
npm install @t3-oss/env-nextjs @zxcvbn-ts/core @zxcvbn-ts/language-common @zxcvbn-ts/language-pt-br otplib qrcode decimal.js server-only

# Only if manual Origin check insufficient
# npm install @edge-csrf/nextjs

# Dev — testing
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom vite-tsconfig-paths playwright @playwright/test @types/qrcode

# Pre-install version verification (run when network available)
npm view @t3-oss/env-nextjs version peerDependencies
npm view @edge-csrf/nextjs version peerDependencies
npm view @zxcvbn-ts/language-pt-br version
npm view vitest version
npm view otplib version
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@t3-oss/env-nextjs` | `envalid` | If you don't want zod coupling (you do — you already use zod). |
| `zxcvbn-ts` + pt-BR | Have-I-Been-Pwned API | If you need real-time breach checking (requires internet on every signup; latency cost). |
| Manual `Origin` check for CSRF | `@edge-csrf/nextjs` | If you add webhooks or third-party clients that POST to your API. |
| Vercel Cron | Inngest | When you have 3+ background jobs or need retries/observability. |
| Prisma `$extends` audit | DB triggers | If audit must survive Prisma rewrite (not your case). |
| `decimal.js` reuse | `prisma.$queryRaw` with `SUM()` | When aggregating millions of rows — let Postgres do it. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Helmet** | Express middleware, doesn't integrate with App Router | `headers()` in `next.config.ts` + middleware nonce |
| **`prisma-audit`** | Built on Prisma `$use` (removed in 5+); broken on Prisma 7 | Prisma `$extends({ query })` API |
| **`speakeasy`** | Unmaintained since 2017 | `otplib` |
| **`node-2fa`** | Thin wrapper on otplib with extra deps | `otplib` direct |
| **Original `zxcvbn` (Dropbox)** | Unmaintained, no TS, no language packs | `zxcvbn-ts` |
| **`csurf`** | Deprecated 2022, Express-bound | `@edge-csrf/nextjs` or manual Origin |
| **`pg_audit`** | Needs Postgres extension Vercel doesn't expose | Prisma extension audit |
| **`node-cron` / `setInterval`** | Won't survive serverless cold starts | Vercel Cron |
| **Migrating to Auth.js / Lucia / Clerk** | Explicitly out of scope (PROJECT.md) | Keep custom JWT — just harden it |
| **Server-side `xss` / `dompurify`** | React auto-escapes; not needed | N/A |

## Stack Patterns by Variant

**If staying on Vercel (current default):**
- Use Vercel Cron via `vercel.json` for token cleanup
- Trust `x-forwarded-for` when `process.env.VERCEL === "1"`
- Skip self-hosting Redis — Upstash REST API is right

**If moving off Vercel (future):**
- Replace Vercel Cron with system cron + a `/api/cron/*` endpoint behind auth
- Add explicit `TRUSTED_PROXY` env var; reject `x-forwarded-for` when absent
- Provision Redis (Upstash or self-hosted) — in-memory fallback is single-process only

**If 2FA stays optional (current plan):**
- Add `TwoFactor` model linked to `User` (or columns on `User`)
- Generate 8–10 single-use recovery codes; bcrypt-hash them
- Verify TOTP in login Server Action after password check passes

## How Each New Library Plugs Into FinSmart

**`@t3-oss/env-nextjs`** — create `src/env.ts`:
- Server schema: `JWT_SECRET` min 32, `DATABASE_URL` URL, `ANTHROPIC_API_KEY` starts with `sk-`, `RESEND_API_KEY`, `UPSTASH_*` optional in dev, `APP_URL` URL, `CRON_SECRET` for Vercel Cron.
- Import `env` everywhere instead of `process.env`. Throws at module load → "validate env at boot" requirement satisfied.

**`zxcvbn-ts` + pt-BR** — create `src/lib/password-strength.ts`:
- Call `zxcvbnOptions.setOptions(...)` once at module load with pt-BR dictionary merged into common.
- Reject scores `< 3` in `registerSchema` + password change/reset.
- Pass `email` and `name` as `userInputs` to catch personal-info passwords.
- Replaces `COMMON_PASSWORDS` array in `src/lib/schemas.ts`.

**`otplib`**:
- `authenticator.generateSecret()` → store base32 in `TwoFactor` table.
- `authenticator.keyuri(email, "FinSmart", secret)` → `qrcode.toDataURL()` for enrollment UI.
- `authenticator.verify({ token, secret })` in login Server Action after password OK.

**`decimal.js`** in dashboard/reports aggregation paths only:
```ts
transactions.reduce((sum, t) => sum.plus(t.amount), new Decimal(0))
```
Prisma already resolves to the same library; `npm ls decimal.js` should show single resolution.

**Security headers** — split by lifetime:
- **Static** (HSTS, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy minimal, X-Content-Type-Options nosniff) → `headers()` in `next.config.ts`. CDN-cached, zero runtime cost.
- **CSP with nonce** → `src/middleware.ts`: `crypto.randomUUID()` per request, set `Content-Security-Policy` header, propagate nonce to layout via `request.headers.set("x-nonce", nonce)` then `headers().get("x-nonce")` in `src/app/layout.tsx`.

Starter CSP:
```
default-src 'self';
script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
style-src 'self' 'nonce-{NONCE}';
img-src 'self' data: blob:;
connect-src 'self' https://api.anthropic.com https://*.upstash.io;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```
`'strict-dynamic'` lets Next.js's chunked loader work with a single nonce.

**CSRF on `/api/auth/*`** — simplest fix first: manual `Origin`/`Referer === env.APP_URL` check at top of each handler. Add `@edge-csrf/nextjs` only if a future use case demands tokens. Server Actions are already CSRF-safe (Next.js built-in origin check since 14.1) — do not add tokens to them.

**Trusted proxy detection** — no lib. Patch `src/lib/ratelimit.ts#getClientIp()`:
```ts
const isTrustedProxy = process.env.VERCEL === "1" || process.env.TRUSTED_PROXY === "true";
const xff = isTrustedProxy ? req.headers.get("x-forwarded-for") : null;
```
Add boot-time warn if `NODE_ENV === "production"` && no proxy signal.

**Audit log** — Prisma 7 `$extends({ query: { transaction: { update, delete }, goal: {...}, budget: {...}, monthlyFee: {...} } })`:
- Read the old row before mutating.
- Wrap mutation + audit row write in the same `prisma.$transaction([...])` — otherwise failed mutations still produce audit rows.
- Schema: `AuditLog { id, userId, model, recordId, op, before Json, after Json?, at }`.

**Token cleanup** — `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/cleanup-tokens", "schedule": "0 3 * * *" }] }
```
Handler deletes `EmailVerificationToken` and `PasswordResetToken` where `expiresAt < now()`. Auth the cron path with `CRON_SECRET` header.

**Vitest setup**:
- `vite-tsconfig-paths` for `@/*` alias.
- Server Actions invoked as functions; `vi.mock("@/lib/auth-server")` for `requireUserId`.
- Separate test DB (`.env.test`, `finsmart_test`); reset with `prisma db push --force-reset` per suite OR wrap each test in a transaction that rolls back.
- Mock `@upstash/ratelimit` for unit tests; use in-memory fallback for integration tests.
- `await prisma.$disconnect()` in `afterAll` or the runner hangs.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@t3-oss/env-nextjs` | zod 3+ | You're on zod 4.4.3 — verify peer dep accepts 4.x; may need wrapping. |
| `@edge-csrf/nextjs` | Next.js 14/15 confirmed | Next.js 16 compat unverified — confirm before adopting. |
| `otplib` | Node + Edge | Use `otplib/preset-browser` if Web Crypto needed in middleware. |
| `bcryptjs` | Node + Edge | Pin exact `3.0.3` — caret range allows breaking 4.x. |
| `next-themes` + nonce CSP | Requires `<ThemeProvider nonce={nonce}>` | Otherwise dark-mode flicker returns under strict CSP. |
| `recharts` + CSP | May need `style-src 'unsafe-inline'` initially | Test before locking down inline styles. |
| `@prisma/adapter-pg` + Vitest | Real PG connections | Must call `await prisma.$disconnect()` in `afterAll`. |

## Pitfalls Specific to This Stack (cross-reference PITFALLS.md)

1. **`next-themes` + nonce CSP** — pass `nonce` to `<ThemeProvider>` or dark mode flickers under CSP.
2. **`recharts` + CSP** — inline styles; test before locking `style-src`.
3. **`@upstash/ratelimit` in global Edge middleware** — adds latency to every request. Keep rate limit in route handlers (Node), not global middleware.
4. **Prisma `$extends` + transactions** — wrap audit row write in same `$transaction` as mutation.
5. **`jose` + Edge** — already correct. Do not introduce `jsonwebtoken` (Node-only) or middleware breaks.
6. **bcryptjs `^3.0.3`** — caret allows breaking 4.x. Pin exact.
7. **`@prisma/adapter-pg` + Vitest** — call `$disconnect()` in `afterAll` or runner hangs.

## Sources

- Next.js 16 App Router docs — CSP / middleware / Server Actions CSRF behavior (verify on `nextjs.org`)
- Prisma 7 Client Extensions API — `$extends({ query })` examples (verify on `prisma.io/docs`)
- `@t3-oss/env-nextjs` README — server/client schema pattern
- `zxcvbn-ts` README — language pack composition
- `otplib` README — keyuri + verify flow
- Vercel Cron docs — `vercel.json` format + `CRON_SECRET` auth
- Researcher confidence: MEDIUM (no network access in research session — all versions need `npm view` confirmation before pinning)

## Open Verification Items (run when network is available)

- [ ] Confirm latest stable versions for each pin (training cutoff Jan 2026).
- [ ] Confirm `@edge-csrf/nextjs` supports Next.js 16 (last verified 14/15).
- [ ] Confirm `@zxcvbn-ts/language-pt-br` is current.
- [ ] Confirm Vitest major (3 vs 4).
- [ ] Confirm zod 4.x peer compatibility for `@t3-oss/env-nextjs`.

---
*Stack research for: FinSmart security hardening*
*Researched: 2026-05-31*
