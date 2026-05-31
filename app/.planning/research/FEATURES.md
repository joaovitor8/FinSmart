# Feature Research

**Domain:** Personal finance app — security & financial-integrity capabilities (NOT new financial features)
**Researched:** 2026-05-31
**Confidence:** MEDIUM — researcher had no live web access; competitor categorizations from training data through early 2025 + stable OWASP/NIST guidance.

## Context: FinSmart Baseline (DO NOT re-recommend)

| Already Present | Source |
|---|---|
| Email verification (token hash + Resend, 24h TTL) | INTEGRATIONS.md |
| Password reset (token hash + Resend, 1h TTL) | INTEGRATIONS.md |
| JWT in HttpOnly cookie + bcrypt 12 | INTEGRATIONS.md |
| Stateful sessions w/ DB revocation (no UI) | INTEGRATIONS.md |
| Rate limit on auth (Upstash + in-mem fallback, IP-spoof risk flagged) | INTEGRATIONS.md / CONCERNS.md |
| Weak-password wordlist (~40 entries, insufficient) | CONCERNS.md |
| Settings page w/ password change + account delete | PROJECT.md |
| SameSite=Strict cookies (implicit CSRF defense for Server Actions) | CONCERNS.md |

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes a 2026 finance app feel insecure or amateur. Source: Monarch, YNAB, Empower, Mobills, Organizze all expose these.

| Feature | Why Expected | Complexity | Overlaps Existing | Notes |
|---------|--------------|------------|-------------------|-------|
| **TOTP-based 2FA (authenticator app)** | Industry standard since ~2020; Monarch/YNAB/Mobills all support TOTP | MEDIUM | NEW | `otplib` + QR + backup codes. Opt-in toggle in Settings. Re-auth to enable/disable. |
| **2FA backup/recovery codes** | Users lose phones; without backup, support nightmare | LOW | NEW | 8–10 single-use codes, bcrypt-hashed, shown once at enrollment + regen option |
| **Strong password policy via entropy (`zxcvbn`)** | "Min 8 chars" no longer credible; strength meter expected | LOW | PARTIAL — wordlist exists, weak | PROJECT.md already mandates `zxcvbn` (pt-BR pack) |
| **Active sessions list + revoke (UI)** | "Where am I logged in?" — Google/Apple/GitHub set the expectation | MEDIUM | PARTIAL — sessions in DB, no UI | Settings tab listing UA/IP/last-active per session + "revoke this" + "revoke all others" |
| **Login notifications by email** | Nubank/Inter send these by default; absence feels negligent | LOW | NEW | Email on new device/IP login via Resend; throttle |
| **Re-authentication for destructive actions** | Re-enter password (or TOTP) for change email/password, disable 2FA, delete account | LOW | PARTIAL — password change has it | Within last 5-min window |
| **Account lockout / progressive backoff** | Brute-force defense beyond per-IP rate limit | LOW | PARTIAL — IP RL exists, no per-account | Lock account 15 min after N failures; email user |
| **CSRF tokens on auth API Routes** | Server Actions are CSRF-safe; `/api/auth/*` POST routes are not | LOW | NEW | Origin/Referer check or synchronizer token |
| **Security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)** | Basic XSS/clickjacking defense; flagged by every scanner | MEDIUM | NEW | `next.config.ts` headers + middleware (CSP needs nonce strategy) |
| **Auth middleware at edge** | Reject unauthenticated requests before pages/actions execute | LOW | NEW | `src/middleware.ts` verifies JWT signature; `requireUserId()` stays as final guard |
| **Explicit multi-tenant scoping in every query** | Single biggest authz risk in solo-built apps | MEDIUM | PARTIAL — most actions check userId; Budget constraint suspicious | Add `@@unique([userId, categoryId])`, audit every `where:`, write isolation tests |
| **Account data export (LGPD/GDPR-style)** | LGPD requires it for BR users | MEDIUM | NEW | "Baixar meus dados" → JSON/CSV bundle of all user-owned tables. Reuses CSV export infra. |
| **True account deletion (cascade + session revocation)** | LGPD right to erasure | LOW | PARTIAL — delete exists, cascade unaudited | Re-auth → delete user + cascade owned rows + revoke all sessions + confirmation email |
| **Boot-time validation of critical env vars** | Avoids "app starts, fails on first action" (Anthropic key bug) | LOW | NEW | `src/env.ts` via `@t3-oss/env-nextjs`; fails at module load |
| **Audit log of financial mutations (backend)** | "Quem mudou esse valor?" — trust feature; YNAB-tier standard | MEDIUM | NEW | Append-only `AuditLog`: actor, action, entity, before/after snapshot, timestamp |
| **Soft delete with recovery window for transactions** | Accidental-delete protection; 30-day undo | MEDIUM | NEW | `deletedAt` column + nightly purge job; complements audit log |
| **Idempotency on CSV import** | Re-uploading same file shouldn't double-create rows | MEDIUM | NEW | Hash of (date, amount, description, categoryId) → unique-or-skip; show "X duplicadas ignoradas" |
| **Cleanup of expired verification/reset tokens** | DB hygiene + security signal | LOW | NEW | Vercel Cron daily sweep |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Breached-password check (HIBP k-anonymity API)** | "Sua senha apareceu em 4.738 vazamentos" — concrete trust signal | LOW | SHA-1 prefix → `api.pwnedpasswords.com/range/{prefix}`; suffix-check local. Password never leaves logic. |
| **User-visible Security Center** | Single view: 2FA status, recent logins, active sessions, last password change, export. Mirrors Google/GitHub. | MEDIUM | `/settings/security` aggregates existing primitives. High perceived value, low backend cost once primitives exist. |
| **Per-entity audit history visible to user** | "Você editou esta transação em 12/05: R$ 50 → R$ 75" | MEDIUM | Builds on audit log; timeline in entity detail. |
| **CSP violation reporting endpoint** | `report-uri` collects browser-detected violations → log → triage | LOW | Single API route; low cost once CSP exists. |
| **Hardware key (WebAuthn / Passkeys) as 2nd factor** | YubiKey/passkey is differentiator vs Mobills/Organizze | HIGH | `@simplewebauthn/server` + `@simplewebauthn/browser`. Stretch goal after TOTP. |
| **Encrypted-at-rest for narrow sensitive fields (TOTP secrets, recovery codes)** | Defense against DB dump for most sensitive secrets only | MEDIUM | App-layer AES-GCM. Do NOT extend to financial data (breaks indexes/queries). |
| **Vitest security test suite** | Not user-visible, but enables every other item to remain correct | MEDIUM | Multi-tenant isolation, rate limit, session revocation, decimal precision, CSRF, password policy |
| **Decimal precision regression tests** | "R$ 0,01 missing after 1000 transactions" — exact assertions on `Decimal(12,2)` | LOW | CONCERNS.md flags untested. Cheap, high-signal. |
| **AI mentor data-sharing consent prompt** | LGPD signal: surface that Mentor sends data to Anthropic | LOW | One-time consent in onboarding + revocable in Settings |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **SMS-based 2FA** | "Most apps have it"; banks use it | SIM-swap is #1 ATO vector in Brazil; NIST SP 800-63B-3 deprecated SMS for high-assurance auth (2017+); telco costs | **TOTP via authenticator app** |
| **Email-only 2FA** | "Convenient, no app to install" | If email is compromised (the assumed threat), email 2FA provides zero protection | TOTP + backup codes |
| **Security questions ("nome do seu pet")** | "Banks use it" | Trivially social-engineered; often public on social media; NIST advises against; adds PII surface | Backup codes + verified-email recovery only |
| **Force password rotation every 90 days** | "Compliance pattern" | NIST explicitly advises against — leads to `Senha2026!1` → `Senha2026!2` | Force change only on confirmed compromise (HIBP hit, suspicious login) |
| **CAPTCHA on every login** | "Block bots" | Hurts PWA UX; rate limit already covers brute force; reCAPTCHA leaks to Google (LGPD) | Progressive: rate limit → lockout → CAPTCHA only after N failures |
| **Mandatory 2FA from day 1** | "Most secure default" | Solo dev locks himself out; adoption friction; no real users to mandate | Opt-in initially; promote in Security Center; mandate at maturity |
| **Full audit log of READ operations** | "Track everything for compliance" | Massive write amplification (every dashboard load = N writes); LGPD doesn't require it | Audit only mutations of financial entities |
| **Real-time "logged in elsewhere" presence** | "Slack/Discord have it" | Requires WebSocket/SSE; finance app doesn't need real-time | Last-active timestamp on sessions list |
| **Migrate to Auth.js / Lucia / Clerk** | "Libs are more secure than custom" | PROJECT.md explicitly out-of-scope; migration > hardening delta | Keep `jose` + `bcryptjs`; add missing pieces on top |
| **OAuth / "Login with Google"** | Convenience | PROJECT.md out-of-scope; third-party token complexity | Defer to separate milestone if demand emerges |
| **Pentest cert / SOC2 / ISO27001** | "Real finance apps have it" | PROJECT.md out-of-scope; $15k–$50k; not justified pre-launch | Document threat model; run OWASP ZAP in CI |
| **Encryption-at-rest of ALL fields** | "Bank-grade encryption" | Managed Postgres already encrypted at rest; app-layer breaks indexes/sorts → reports impossible | Rely on DB encryption; narrow-field encryption only for TOTP secrets |
| **Client-side E2E encryption** | "Zero-knowledge architecture" | Breaks AI mentor; breaks reports; threat model doesn't justify | Out of scope |
| **Bug bounty program** | "Mature security signal" | No users, no surface, no triage capacity | `SECURITY.md` with disclosure email; revisit post-launch |
| **CSV import streaming with PostgreSQL `COPY`** | "Scale" | FinSmart import is bounded; premature optimization | Current `createMany` is fine |

## Feature Dependencies

```
[Auth Middleware at Edge]
    └──enables──> [Faster rejection of invalid sessions]
    └──enables──> [Lower attack surface across all protected routes]

[Multi-tenant query audit + @@unique([userId, categoryId])]
    └──required-by──> [Isolation Tests]
                           └──required-by──> [Any future shared/family feature]

[2FA (TOTP)]
    └──requires──> [Backup Codes]
    └──requires──> [Re-auth flow for sensitive actions]
    └──enhances──> [Security Center page]

[Active Sessions UI]
    └──requires──> [Session metadata at login (UA, IP, createdAt)]
    └──enhances──> [Login Notification emails]
    └──enhances──> [Security Center page]

[Audit Log (mutations)]
    └──conflicts-with──> [Hard-delete-only model] (orphans audit refs)
    └──pairs-with──> [Soft Delete] (keeps "before" snapshot meaningful)
    └──required-by──> [Per-entity history UI]

[CSP Headers]
    └──requires──> [Nonce/strict-dynamic strategy for Next.js inline scripts]
    └──enhances──> [CSP Violation Reporting Endpoint]

[Account Lockout]
    └──requires──> [Per-user failed-attempt counter (not just per-IP)]
    └──enhances──> [Login Notification (lockout-triggered email)]

[zxcvbn Password Policy]
    └──replaces──> [Hardcoded COMMON_PASSWORDS wordlist]
    └──pairs-with──> [HIBP breached-password check]

[Vitest Security Test Suite]
    └──required-by──> [ALL other items — without tests, regressions invisible]

[Rate Limit IP-Spoof Hardening]
    └──requires──> [Decision: trusted-proxy-only OR validate forwarding chain]
```

### Critical Dependency Notes

- **TOTP without backup codes = locked accounts.** Always ship together.
- **Audit log conflicts with hard delete** — soft-delete keeps the "before" snapshot meaningful.
- **Security Center is presentation-only** — depends on 2FA + Active Sessions + Login Notifications + Account Delete existing. Build it LAST, not first.
- **Isolation tests must gate `@@unique([userId, categoryId])` migration** — otherwise risk silently breaking budgets.
- **CSP nonces require nonce-injecting middleware** — App Router emits inline hydration scripts. CSP without nonces breaks hydration. Trickiest part of headers work.

## MVP Definition for This Hardening Milestone

### Launch With (Hardening v1 — non-negotiable)

These are where missing = milestone failed its Core Value ("user A never sees user B's data; app resists trivial abuse").

- [ ] Multi-tenant isolation audit + tests (`@@unique([userId, categoryId])`) — closes biggest authz risk
- [ ] Auth middleware at edge — defense in depth
- [ ] CSRF protection on `/api/auth/*` routes — cheap, immediate
- [ ] Security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy) — table stakes
- [ ] `zxcvbn` password policy (replaces wordlist) — meaningful entropy
- [ ] Rate-limit IP-spoof hardening (trusted-proxy declaration + startup check) — closes spoof CVE class
- [ ] Env-var validation at boot — kills "looks healthy, fails later" bug class
- [ ] Goal progress upper bound (server-side reject `newCurrent > target`) — financial integrity
- [ ] Decimal-precision regression tests — locks money correctness
- [ ] Expired token cleanup — DB hygiene + security signal
- [ ] Vitest scaffold + security test suite — enables all other items to stay correct

### Add After Validation (Hardening v1.x)

- [ ] TOTP 2FA + backup codes — biggest single trust upgrade beyond v1
- [ ] Re-auth for destructive actions — cheap once 2FA exists
- [ ] Active sessions list + revoke (UI) — surface what's in DB
- [ ] Login notifications by email — Resend already integrated
- [ ] Audit log of mutations (backend only first) — schema + Prisma `$extends`
- [ ] Account lockout after N failed attempts — pairs with login notifications
- [ ] HIBP breached-password check — pairs with `zxcvbn`
- [ ] Account data export (LGPD) — reuses CSV export
- [ ] Verified true account deletion + cascade audit — confirm what already exists actually cascades

### Future Consideration

- [ ] Security Center page — defer until 4+ underlying features exist
- [ ] Audit log history UI — after backend audit log stable
- [ ] Soft delete + 30-day recovery — post-launch; hard-delete + audit suffices pre-launch
- [ ] CSV import idempotency — when real users start re-uploading
- [ ] CSP violation reporting endpoint — after CSP in production with traffic
- [ ] WebAuthn / Passkeys — high effort, niche
- [ ] App-layer encryption of narrow fields — only if threat model demands

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Multi-tenant isolation audit + tests | HIGH | MEDIUM | P1 |
| Auth middleware at edge | MEDIUM | LOW | P1 |
| CSRF on `/api/auth/*` | HIGH | LOW | P1 |
| Security headers (CSP etc.) | MEDIUM | MEDIUM (CSP nonce fiddly) | P1 |
| `zxcvbn` password policy | MEDIUM | LOW | P1 |
| Env-var boot validation | LOW (ops-only) | LOW | P1 |
| Decimal-precision tests | HIGH (silent correctness) | LOW | P1 |
| Goal progress bounds | MEDIUM | LOW | P1 |
| Vitest security suite | HIGH (enables all others) | MEDIUM | P1 |
| Rate-limit IP-spoof hardening | MEDIUM | LOW | P1 |
| Expired token cleanup | LOW | LOW | P1 |
| TOTP 2FA + backup codes | HIGH | MEDIUM | P2 |
| Active sessions UI | MEDIUM | MEDIUM | P2 |
| Login notifications | MEDIUM | LOW | P2 |
| Audit log (backend) | MEDIUM | MEDIUM | P2 |
| Account lockout per user | MEDIUM | LOW | P2 |
| Re-auth for destructive actions | MEDIUM | LOW | P2 |
| HIBP breached-password check | MEDIUM | LOW | P2 |
| Account data export (LGPD) | MEDIUM | MEDIUM | P2 |
| Verified true account delete | MEDIUM | LOW | P2 |
| Security Center page | HIGH (perceived) | LOW (aggregates) | P3 |
| Audit log history UI | MEDIUM | MEDIUM | P3 |
| Soft delete + recovery | MEDIUM | MEDIUM | P3 |
| CSV import idempotency | LOW | MEDIUM | P3 |
| CSP violation reporting | LOW | LOW | P3 |
| WebAuthn / Passkeys | LOW (niche) | HIGH | P3 |
| App-layer field encryption | LOW | HIGH | P3 |

**Priority key:** P1 must have for milestone; P2 should have, add when possible; P3 nice to have, future consideration.

## Competitor Feature Analysis

Confidence: MEDIUM (training data through ~early 2025; verify when implementing).

| Feature | Monarch | YNAB | Empower (ex-PC) | Mobills (BR) | Organizze (BR) | For FinSmart |
|---------|---------|------|------|------|------|--------------|
| TOTP 2FA | Yes | Yes | Yes | Yes (recent) | Partial (app PIN) | **Yes (P2)** |
| SMS 2FA | Yes (legacy) | No | Yes | Yes | No | **No (anti)** |
| Email-code 2FA | No | No | No | Sometimes | No | **No (anti)** |
| WebAuthn / Passkey | Limited | No | Limited | No | No | **Defer (P3)** |
| Active sessions UI | Yes | Yes | Yes | Limited | Limited | **Yes (P2)** |
| Login notifications | Yes | Yes | Yes | Partial | No | **Yes (P2)** |
| Account lockout | Yes | Yes | Yes | Yes | Yes | **Yes (P2)** |
| Re-auth for destructive | Yes | Yes | Yes | Partial | Partial | **Yes (P2)** |
| Data export (CSV/JSON) | Yes | Yes | Yes | Yes | Yes | **Yes (P2)** |
| True account deletion | Yes (GDPR) | Yes | Yes | Yes (LGPD) | Yes (LGPD) | **Yes (P2)** |
| User-visible audit log | Partial | Yes (txn-level) | No | No | No | **Yes — differentiator (P2 backend / P3 UI)** |
| Soft delete + undo | Limited | Yes (recent txns) | No | Limited | Limited | **Defer (P3)** |
| App PIN / biometric (PWA) | iOS/Android only | iOS/Android only | iOS/Android only | Yes (mobile) | Yes (mobile) | **Out of scope (web PWA)** |
| Status / incident page | Yes | Yes | Yes | No | No | **Out of scope (no users yet)** |
| Bank-connection security | Heavy (Plaid/MX) | Heavy | Heavy | Yes (Belvo/Pluggy) | Yes | **N/A — manual + CSV** |

**Key takeaways:**
- **TOTP 2FA + active sessions + login notifications** are the FLOOR across all five competitors. FinSmart is below floor.
- **SMS 2FA** is supported by older apps but actively deprecated for new signups. Don't implement.
- **User-visible audit log** is where YNAB stands out. Believable differentiator for FinSmart.
- **Bank-connection disclosures** irrelevant — FinSmart is manual entry + CSV.

## Brazilian Context (LGPD)

- **Right to data export:** P2 — CSV/JSON bundle of all user-owned tables.
- **Right to erasure:** verify current account deletion truly cascades + revokes sessions + sends confirmation.
- **Data breach notification:** process, not code — document in `SECURITY.md` (out of scope for this milestone).
- **Consent for AI processing:** Mentor sends financial context to Anthropic. Surface in onboarding/Settings: *"O Mentor IA envia resumo dos seus dados financeiros à Anthropic. Você concorda?"* Low complexity, high LGPD signal.
- **Data minimization:** FinSmart already collects minimal data. No retrofit needed.
- **DPO / privacy policy:** legal artifacts, out of scope.

## Cross-Reference With CONCERNS.md

| CONCERNS.md item | Status here | Tier |
|---|---|---|
| Missing edge middleware | Recommended | P1 |
| No CSP / security headers | Recommended | P1 |
| `@@unique([userId, categoryId])` | Recommended | P1 |
| Goal progress bounds | Recommended | P1 |
| Expired tokens not cleaned | Recommended | P1 |
| IP rate-limit spoof risk | Recommended | P1 |
| Weak `COMMON_PASSWORDS` list | Recommended (`zxcvbn` pt-BR) | P1 |
| No CSRF on `/api/auth/*` | Recommended | P1 |
| Anthropic key not validated at boot | Recommended (env validation) | P1 |
| No tests (isolation/ratelimit/sessions/decimal) | Recommended (Vitest suite) | P1 |
| No 2FA | Recommended (TOTP + backup codes) | P2 |
| No audit log | Recommended (P2 backend / P3 UI) | P2/P3 |
| CSV import silent skips | Defer full idempotency; tighten UX msg now | P3 |
| Session revocation race | Acknowledge but defer — low impact in dev single-instance | not recommended |

Items in CONCERNS.md NOT in this research because **out of milestone scope** (per PROJECT.md):
- Performance issues (N+1, unbounded queries) — separate optimization milestone
- Recurring transactions, multi-user families — feature work, deferred
- Dependency pinning (bcryptjs, resend) — operational hygiene; flag in CI but not a security phase

## Roadmap Implications

- Suggested phase structure flows from the **P1 list** (Hardening v1: isolation, middleware, CSRF, headers, password policy, tests, env validation, token cleanup, goal bounds, decimal tests). Mostly independent — splits across 3–4 phases.
- **Phase ordering critical:** Vitest scaffold + isolation tests MUST come before any schema migration (`@@unique([userId, categoryId])`) or query refactor.
- **CSP is the trickiest P1 item** — flag for deeper research at phase start (Next.js 16 + App Router + nonce strategy).
- **2FA (P2)** should be its own dedicated phase — touches schema, settings UI, login flow, re-auth flow, email templates. Don't combine with other P2 items.
- **Audit log (P2)** should be its own phase — schema, write hooks across 4+ action files, conflicts with soft delete semantics.
- **Security Center (P3)** is presentation-only and should be the FINAL UI phase, gathering threads.

## Sources

- Competitor products: Monarch Money, YNAB, Empower (ex-Personal Capital), Mobills, Organizze (training data through early 2025).
- OWASP ASVS v4/v5 — control categories and verification requirements.
- NIST SP 800-63B-3 — password rotation, SMS 2FA deprecation, breached-password checking.
- LGPD (Lei Geral de Proteção de Dados, Brazil) — data export and erasure requirements.
- FinSmart project docs: `PROJECT.md`, `codebase/INTEGRATIONS.md`, `codebase/CONCERNS.md`.

## Open Questions (for orchestrator / requirements phase)

- **Trusted-proxy guarantee:** Is FinSmart definitely on Vercel? If yes, IP-spoof hardening simplifies. If maybe self-hosted, needs forwarding-chain validation.
- **AI mentor consent in scope?** LGPD signal but not strictly security; confirm if it belongs in this milestone or a future compliance pass.
- **CSV import idempotency tier:** flagged P3, but if user re-uploads frequently in dev, may be P2.
- **Mandatory 2FA timing:** never mandatory in this milestone; worth deciding the trigger for future mandate.

---
*Feature research for: FinSmart security hardening*
*Researched: 2026-05-31*
