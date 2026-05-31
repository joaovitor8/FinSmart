# Project Research Summary

**Project:** FinSmart — Security Hardening Milestone
**Domain:** Personal finance app (Next.js 16 + Prisma 7 + custom JWT) — hardening existing code, no new financial features
**Researched:** 2026-05-31
**Confidence:** MEDIUM (ARCHITECTURE: HIGH; STACK/FEATURES/PITFALLS: MEDIUM)

## Executive Summary

FinSmart is a solo-dev personal finance app that has a functioning auth system (JWT in HttpOnly cookie, bcrypt, stateful sessions, Upstash rate limit, email flows via Resend) but is missing the defense-in-depth layers that 2026 finance apps require. The hardening milestone is not a rewrite — it is filling well-defined gaps across 7 layers (platform config, proxy, layout guard, DAL, API routes, Prisma extensions, PostgreSQL schema) using the existing stack. The architecture already has one key surprise: `src/proxy.ts` is the Next.js 16 rename of `middleware.ts` and already handles JWT auth and CSP nonce in production — phases must *expand* it, not create it.

The recommended approach is a strict build order: foundation (env validation + schema fix + Vitest + first isolation tests) must ship before anything else touches auth code. Proxy hardening and API hardening can follow in parallel. The DAL refactor is the single highest-leverage change — extracting Prisma calls behind explicit `userId` parameters closes the IDOR risk across all CRUD. Audit log, 2FA, and Security Center are sequentially dependent on the DAL being solid. The test suite is not optional: without Vitest integration tests running against a real Postgres, every hardening claim is unverified.

Key risks: (1) multi-tenant isolation is currently untested and one Budget schema constraint is wrong (`@@unique([categoryId])` must become `@@unique([userId, categoryId])`); (2) CSP nonce propagation to `next-themes` `<ThemeProvider>` is required or dark-mode breaks under strict CSP; (3) 2FA without backup codes causes account lockouts — ship them together. None of these are blockers, but all three cause silent failures if skipped.

## Key Findings

### Recommended Stack

Keep the existing core (`jose`, `bcryptjs`, `zod`, `@upstash/ratelimit`, `next-themes`). The additions are narrow and purposeful: `@t3-oss/env-nextjs` for boot-time env validation (replaces the current silent-fail bug on bad `ANTHROPIC_API_KEY`), `zxcvbn-ts` with the pt-BR language pack to replace the 40-entry `COMMON_PASSWORDS` array, `otplib` + `qrcode` for TOTP 2FA, `decimal.js` (already a Prisma transitive dep — just expose it for in-app aggregation), and `server-only` to guard server modules from accidental client bundling. Vitest + `@vitest/coverage-v8` + real-Postgres integration tests replace the current zero-test state.

**Core additions:**
- `@t3-oss/env-nextjs` — boot-time zod env validation — fails at module load, not at first user action
- `zxcvbn-ts` + `language-pt-br` — password entropy with BR dictionary — replaces weak 40-word wordlist
- `otplib` — TOTP 2FA (Google Authenticator compatible) — only maintained option; `speakeasy` is dead
- `decimal.js` — precise BRL sums — reuses the same lib Prisma already pulls in
- `server-only` — compile-time guard for server modules — prevents auth logic bundling into client
- `vitest` + real Postgres — integration tests — without real DB, isolation tests are meaningless

**Verify before pinning** (researcher had no live network): `@t3-oss/env-nextjs` zod 4.x peer compat, `@edge-csrf/nextjs` Next.js 16 compat, Vitest major version (3 vs 4).

### Expected Features

**P1 — must ship (hardening fails without these):**
- Multi-tenant isolation audit + `@@unique([userId, categoryId])` on Budget — biggest authz risk today
- Auth middleware expansion in `src/proxy.ts` — move IP rate limit from per-route to edge; fix `connect-src`
- CSRF protection on `/api/auth/*` — Origin/Referer check (Server Actions are already protected by Next.js)
- Security headers — HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options in `next.config.ts`; CSP with nonce in `src/proxy.ts`
- `zxcvbn` password policy (pt-BR) — replaces 40-word list
- Env-var boot validation — closes the Anthropic-key silent-fail bug class
- Rate-limit IP-spoof hardening — trust `x-forwarded-for` only when `VERCEL=1` or `TRUSTED_PROXY=true`
- Goal progress server-side bound — reject `newCurrent > target` in action, not just UI
- Decimal-precision regression tests — 1000-transaction sum must be exact to the cent
- Expired token cleanup cron — Vercel Cron daily sweep via `CRON_SECRET`
- Vitest scaffold + security test suite — enables every other claim to be verified

**P2 — add after P1 validated:**
- TOTP 2FA + backup codes (ship together — no codes = lockout risk)
- Active sessions list + revoke UI (data already in DB, no UI surface)
- Login notifications by email (Resend already integrated)
- Audit log of mutations — Prisma `$extends({ query })` with AsyncLocalStorage userId
- Account lockout per user (N failures → 15-min lock + email)
- Re-auth for destructive actions (5-min window)
- HIBP breached-password check (k-anonymity prefix; password never leaves app)
- Account data export (LGPD right to access)
- Verified true account deletion + cascade audit (LGPD right to erasure)

**Defer (P3 / future):**
- Security Center page — presentation only; depends on all P2 items existing
- Audit log history UI — after backend stable
- Soft delete + 30-day recovery
- CSV import idempotency
- WebAuthn / Passkeys
- App-layer field encryption for TOTP secrets

**Anti-features to avoid:** SMS 2FA (SIM-swap #1 ATO vector in Brazil), forced 90-day password rotation (NIST-deprecated), security questions, mandatory CAPTCHA on every login, migrating off custom JWT (out of scope per PROJECT.md).

### Architecture Approach

Defense-in-depth across 7 layers (L0 = platform config to L6 = PostgreSQL). The key structural move is creating `src/lib/dal/` — a Data Access Layer where all Prisma calls live behind explicit `userId` parameters, making IDOR structurally impossible rather than depending on per-action discipline. An `authedAction()` higher-order function wraps every Server Action, propagating `userId` via AsyncLocalStorage to Prisma `$extends` audit hooks. `src/proxy.ts` (L1) stays as "cheap reject" (JWT signature, cookie presence, IP rate limit, CSP nonce) — it must never do resource ownership checks, which belong in the DAL.

**Major components:**
1. `src/proxy.ts` (L1, EXPAND) — move IP rate limit here, add `connect-src` for Anthropic + Upstash, verify JWT `alg` allowlist
2. `src/lib/dal/` (NEW, L3) — authoritative DB access, explicit `userId`, `server-only`, `cache()` deduplication
3. `src/lib/auth-server.ts` (L3, EXPAND) — add `authedAction()` HOF + AsyncLocalStorage userId propagation
4. `src/lib/prisma-audit.ts` (NEW, L5) — `$extends.query` audit log in same `$transaction` as mutation
5. `src/lib/env.ts` (NEW, L0) — `@t3-oss/env-nextjs` boot-time validation, fail at module load
6. `src/__tests__/` (NEW) — real-Postgres integration tests at `src/` root, not co-located with source

**Critical discovery:** `src/proxy.ts` already exists with auth + CSP nonce handling. CONCERNS.md note about "no middleware" is outdated. All phase plans must say "expand `src/proxy.ts`", not "create middleware".

### Critical Pitfalls

1. **`@@unique([categoryId])` without userId** — one bad constraint allows cross-user data collision. Prevention: change to `@@unique([userId, categoryId])`; add isolation test that proves cross-user budget upsert fails with a constraint error.

2. **`x-forwarded-for` spoofing** — rate limit is bypassable today if app runs outside Vercel. Prevention: only read XFF when `process.env.VERCEL === "1"` or `TRUSTED_PROXY === "true"`; add boot-time warn if production + no proxy signal.

3. **CSP nonce not passed to `<ThemeProvider nonce={nonce}>`** — dark-mode flicker returns under strict CSP; recharts may also need `style-src 'unsafe-inline'` until tested. Prevention: pass nonce at layout level to both; test with CSP enforced in dev before locking headers.

4. **TOTP 2FA shipped without backup codes** — user loses phone = permanent lockout. Prevention: always ship backup codes with 2FA; use `twoFactorSecretPending` → promote to `twoFactorSecret` only after first valid code.

5. **Audit log row written outside mutation transaction** — failed mutations leave phantom audit rows; rollbacks leave no trace. Prevention: wrap mutation + audit write in the same `prisma.$transaction([...])`.

## Implications for Roadmap

Based on research, the build order from ARCHITECTURE.md maps cleanly to phases. Do not reorder — the dependency chain is strict.

### Phase A: Foundation

**Rationale:** Everything else depends on this. Env validation prevents silent boot failures. Schema fix must land before DAL refactor. Vitest + first isolation tests gate every subsequent hardening claim.
**Delivers:** `src/lib/env.ts` (boot validation), `@@unique([userId, categoryId])` migration, Vitest scaffold + real-Postgres test DB, first isolation test, decimal-precision regression test.
**Addresses:** Env-var silent-fail bug, Budget constraint IDOR risk, decimal precision gap, zero-test state.
**Avoids:** Pitfall 1 (bad unique constraint), Pitfall 10 (decimal precision loss).
**Research flag:** Standard patterns — no deeper research needed.

### Phase B: Proxy + Headers Hardening

**Rationale:** Needs Phase A env validated and schema stable. Parallel-safe with Phase C.
**Delivers:** IP rate limit moved to `src/proxy.ts`, trusted-proxy detection in `getClientIp()`, static headers in `next.config.ts` (HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options), CSP nonce expanded in proxy (add Anthropic + Upstash to `connect-src`), JWT `alg` allowlist verified.
**Addresses:** IP-spoof rate limit bypass, missing security headers, `connect-src` blocking Mentor.
**Avoids:** Pitfall 2 (x-forwarded-for spoof), Pitfall 12 (alg=none), CSP nonce/ThemeProvider issue.
**Research flag:** NEEDS SPIKE — CSP nonce + `next-themes` + App Router inline scripts interaction is the trickiest item in this milestone. Read live proxy output and test before finalizing the phase plan.

### Phase C: API Auth Hardening

**Rationale:** Parallel-safe with Phase B. Fixes auth endpoint vulnerabilities independent of DAL.
**Delivers:** CSRF protection on `/api/auth/*` (Origin/Referer check), `zxcvbn-ts` pt-BR replacing `COMMON_PASSWORDS`, bcrypt 72-byte cap (`.max(72)` in zod), email enumeration fix, timing-safe token comparison audit, open-redirect fix on `?next=` params, CSV export formula-prefix sanitization, session fixation audit.
**Addresses:** CSRF on auth routes, weak password policy, email enumeration, token timing attacks.
**Avoids:** Pitfalls 3, 4, 5, 9, 11, 14.
**Research flag:** Standard OWASP patterns — no deeper research needed.

### Phase D: DAL + authedAction Refactor

**Rationale:** Depends on Phase A. This is the highest-leverage structural change. Audit log (Phase E) and 2FA (Phase G) both depend on `authedAction()` + AsyncLocalStorage.
**Delivers:** `src/lib/dal/` with explicit `userId` in all Prisma calls, `authedAction()` HOF on all Server Actions, dev-only Prisma guard for missing-userId queries, ownership checks centralized, Goal progress server-side upper-bound, isolation tests for all CRUD, decimal-sum audit during refactor.
**Addresses:** IDOR risk across all actions, mass-assignment via spread, Goal progress bypass.
**Avoids:** Pitfall 6 (findUnique IDOR), Pitfall 7 (mass assignment).
**Research flag:** `authedAction()` HOF is the Next.js 16 official Data Security pattern — no research needed.

### Phase E: Audit Log

**Rationale:** Depends on Phase D (AsyncLocalStorage userId must be in place before Prisma extension can read it). LGPD account-delete + audit-retention conflict decided here.
**Delivers:** `AuditLog` Prisma model, `src/lib/prisma-audit.ts` with `$extends.query` on financial entities, mutation + audit in same `$transaction`, tests asserting audit absent on rollback, account-delete cascade to AuditLog.
**Addresses:** Unaccountable mutations, LGPD audit-retention conflict.
**Avoids:** Pitfall 15 (audit outside transaction), Pitfall 19 (LGPD delete vs retention).
**Research flag:** NEEDS SPIKE — verify exact Prisma 7 `$extends.query` syntax within `$transaction` at phase start (MEDIUM confidence).

### Phase F: Token Cleanup Cron

**Rationale:** Fully independent — can ship any time after Phase A. Low priority, low cost.
**Delivers:** `src/app/api/cron/cleanup-tokens/route.ts`, `vercel.json` cron schedule, `CRON_SECRET` auth.
**Addresses:** Expired token accumulation, DB hygiene.
**Research flag:** Standard Vercel Cron pattern — no research needed.

### Phase G: 2FA (TOTP)

**Rationale:** Depends on Phases D + E. New auth flow must be added to a hardened base, not a leaky one.
**Delivers:** `TwoFactor` schema (pending + active secret + recovery codes), `src/lib/totp.ts` (otplib), Settings UI (enroll/view-codes/disable with re-auth), login flow rework to partialToken → `/api/auth/twofa-verify`, 2FA Vitest tests.
**Addresses:** Account takeover via email compromise — the largest missing trust signal.
**Avoids:** Pitfall 16 (secret stored before verification), 2FA lockout without backup codes.
**Research flag:** NEEDS SPIKE — confirm `otplib` + Node 22 / Next.js 16 compat before writing phase plan.

### Phase H: Compliance + P2 User-Facing Features

**Rationale:** After all backend primitives exist, surface them to users and satisfy LGPD obligations.
**Delivers:** Active sessions list + revoke UI, login notifications by email, account lockout (N failures → 15-min + email), re-auth for destructive actions, account data export (LGPD), verified account deletion + cascade, HIBP breached-password check.
**Addresses:** LGPD rights (access + erasure), account takeover UX, session management below competitor floor.
**Research flag:** Standard patterns — HIBP k-anonymity is documented; Resend already in use.

### Phase I: Security Center + SECURITY.md

**Rationale:** Presentation-only, depends on all P2 items. Must come last.
**Delivers:** `/settings/security` page aggregating 2FA status, recent logins, active sessions, password change date, export link. `SECURITY.md` with threat model, env requirements, disclosure email, known limitations.
**Research flag:** No new tech — no research needed.

### Phase Ordering Rationale

- `A → B, C, D` — env validation + schema fix gates all downstream work
- `A → D → E → G` — DAL is required by audit log; audit log de-risks 2FA
- `B || C` — proxy and API hardening are independent; can be one PR or two
- `F` — fully independent; ship whenever bandwidth allows
- `H → I` — Security Center aggregates P2 features; P2 must exist first

### Research Flags

Phases needing a research spike at planning time:
- **Phase B (CSP):** Next.js 16 App Router inline hydration scripts + nonce + `next-themes` + `recharts` interaction. Read live proxy output and test before writing tasks.
- **Phase E (Prisma `$extends`):** Verify exact Prisma 7 syntax for `$extends.query` within `$transaction`. Run a proof-of-concept before writing phase plan.
- **Phase G (otplib):** Confirm compatibility with Node 22 + Next.js 16 before implementation tasks.

Phases with well-documented patterns (skip research-phase):
- **Phase A:** Standard Vitest + Prisma migration
- **Phase C:** OWASP-documented auth endpoint hardening
- **Phase D:** Next.js 16 official Data Security guide pattern
- **Phase F:** First-class Vercel Cron documentation
- **Phase H:** HIBP k-anonymity and Resend are standard integrations
- **Phase I:** Assembly only, no new technology

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | No live network in research session; version pins need `npm view` before locking. Core choices are well-reasoned. `@edge-csrf/nextjs` Next.js 16 compat unverified. |
| Features | MEDIUM | P1/P2/P3 split grounded in OWASP ASVS + NIST SP 800-63B-3 (stable). Competitor data from training cutoff ~early 2025. |
| Architecture | HIGH | Verified against Next.js 16.2.6 docs; `src/proxy.ts` read directly; build order derived from concrete code constraints. |
| Pitfalls | MEDIUM | Orchestrator-synthesized (dedicated researcher hit rate limit). Items marked `[verify]` in PITFALLS.md need code-level confirmation at phase start. |

**Overall confidence:** MEDIUM-HIGH. Architecture is solid. Library version uncertainty is resolved by running `npm view` at Phase A — not a planning blocker.

### Gaps to Address

- **`@t3-oss/env-nextjs` + zod 4.x peer compat** — confirm at Phase A; may need a thin wrapper if peer dep requires zod 3.x.
- **Token comparison in `src/lib/tokens.ts`** — not read during research; confirm `crypto.timingSafeEqual` usage at Phase C start.
- **Email enumeration current behavior** — check current register/login routes at Phase C start; may already be correct.
- **Vercel vs self-hosted decision** — if self-hosting, Phase F cron and `TRUSTED_PROXY` handling differ. Assumed Vercel throughout.
- **AI mentor consent scope** — LGPD signal for surfacing Anthropic data sharing; recommend including in Phase H.
- **`[verify]` items in PITFALLS.md** — Pitfalls 4, 5, 11, 12 need code inspection at phase start, not pre-planning.

## Sources

### Primary (HIGH confidence)
- Next.js 16.2.6 official docs (proxy, data security, CSP guide) — verified by Architecture researcher 2026-05-31
- `src/proxy.ts` live read — 2026-05-31; confirmed auth + CSP nonce baseline exists
- `.planning/codebase/CONCERNS.md`, `ARCHITECTURE.md`, `STRUCTURE.md` — FinSmart-specific ground truth

### Secondary (MEDIUM confidence)
- OWASP ASVS v4/v5 — control categories and feature prioritization
- NIST SP 800-63B-3 — password policy, SMS 2FA deprecation, rotation guidance
- LGPD (Lei 13.709/2018) — data export, erasure, consent requirements
- Prisma 7 `$extends.query` API — patterns confirmed in Prisma 5+; exact Prisma 7 syntax to be verified at Phase E
- `otplib`, `zxcvbn-ts`, `@t3-oss/env-nextjs` READMEs — from researcher training data (no live verification)

### Tertiary (validate before pinning)
- Library version numbers in STACK.md — training cutoff Jan 2026; run `npm view` before locking
- `@edge-csrf/nextjs` Next.js 16 compat — last confirmed on Next.js 14/15 only
- Competitor feature set (Monarch, YNAB, Mobills, Organizze) — training data through early 2025

---
*Research completed: 2026-05-31*
*Ready for roadmap: yes*
