# Codebase Concerns

**Analysis Date:** 2026-05-31

## Tech Debt

**Missing Middleware for Request Validation:**
- Issue: No `middleware.ts` file found to validate authenticated requests at edge runtime. Each server action relies on `requireUserId()` for auth, but there's no early rejection at request level.
- Files: `src/lib/auth-server.ts`, all files in `src/lib/actions/`
- Impact: Potential for invalid/expired tokens to pass through to actions before being caught. Increased latency on rejected requests (full computation before error).
- Fix approach: Implement Next.js middleware to verify JWT signature and session validity before routing to protected pages/actions.

**No Middleware for CSP (Content Security Policy):**
- Issue: `src/proxy.ts` mentions CSP is disabled in dev for HMR, but no CSP header enforcement found for production.
- Files: `src/proxy.ts` (line 58 comment), no proper CSP headers in layout or middleware
- Impact: Vulnerable to XSS attacks (inline scripts, eval). Finance app handling monetary data needs strict CSP.
- Fix approach: Define and enforce CSP headers via Next.js headers config or middleware; whitelist legitimate inline scripts separately.

**Inconsistent Revalidation Pattern:**
- Issue: Multiple server actions call `revalidatePath()` on the same paths repeatedly (e.g., `/main/dashboard` called from transactions, budgets, goals, monthlyFees).
- Files: `src/lib/actions/transactions.ts` (lines 76-78), `src/lib/actions/budgets.ts` (lines 26-27), `src/lib/actions/goals.ts` (lines 52-53, 67-68, 87-88, 98-99), `src/lib/actions/monthlyFees.ts` (lines 75-76), `src/lib/actions/categories.ts` (lines 108-111)
- Impact: Excessive cache invalidation on dashboard; could cause performance degradation as app scales.
- Fix approach: Implement a centralized revalidation helper that debounces or batches revalidations per action type.

**No Unique Constraint on Budget-User-Category:**
- Issue: Schema has `@@unique([categoryId])` on Budget model, but missing `userId` in the unique constraint. A user's budget for category A cannot conflict with another user's budget for the same category (by design it's unique per categoryId), but this assumes category IDs are globally unique per user.
- Files: `src/prisma/schema.prisma` (lines 105-106)
- Impact: If category deletion logic changes, orphaned budgets could create conflicts. Multi-tenancy safety is implicit, not explicit.
- Fix approach: Change `@@unique([categoryId])` to `@@unique([userId, categoryId])` for explicit safety.

## Known Bugs

**Goal Progress Can Exceed Target Without Warning:**
- Symptoms: User can call `addToGoalProgress()` with any amount; `newCurrent` can exceed `target` with no validation warning.
- Files: `src/lib/actions/goals.ts` (lines 72-89), specifically line 80 where `newCurrent` is calculated without bounds check.
- Trigger: Call `addToGoalProgress(goalId, { amount: 1000000 })` when target is 1000.
- Workaround: Frontend could validate, but backend allows any value.
- Fix approach: Add server-side validation: `if (newCurrent > goal.target) throw new Error("Progresso não pode ultrapassar a meta")`.

**CSV Import Silently Skips Invalid Rows:**
- Symptoms: When importing CSV, invalid rows are added to `warnings` but import continues. User doesn't know how many rows actually failed until post-upload.
- Files: `src/lib/csvImport.ts` (lines 136-141, 150-153)
- Trigger: Upload CSV with 100 rows, 10 with missing date. Returns success with warnings but only 90 imported.
- Workaround: User must read warnings carefully.
- Fix approach: Implement stricter CSV validation: fail early on first invalid row or require user to fix all errors before retry.

**Race Condition on Session Revocation During Login:**
- Symptoms: If a user's session is revoked (e.g., password reset) while they're in the middle of another request, `validateSession()` will see `revokedAt` is not null but the request might have already started processing.
- Files: `src/lib/sessions.ts` (lines 27-55), `src/app/api/auth/reset-password/route.ts` (lines 44-57)
- Trigger: Rapid requests during session revocation.
- Impact: Low — Next.js caches at request level, but theoretically possible in distributed environments.
- Workaround: None needed in dev; production with multiple instances could need request correlation IDs.

**Expired Verification/Reset Tokens Not Cleaned Up:**
- Symptoms: `EmailVerificationToken` and `PasswordResetToken` records with `expiresAt < now()` remain in DB indefinitely (no TTL or delete policy).
- Files: `src/prisma/schema.prisma` (lines 32-57), no cleanup job
- Impact: DB bloat over time; tokens can still be looked up even after expiration (though validation catches it).
- Fix approach: Add a Prisma extension or cron job to delete expired tokens weekly, or add `@db.expireAfter("1 day")` directive if using PostgreSQL 14+ (not yet supported in Prisma).

## Security Considerations

**IP-Based Rate Limiting Assumes Trusted Proxy:**
- Risk: `getClientIp()` relies on `x-real-ip` or `x-forwarded-for` headers. If app is NOT behind a reverse proxy, any client can spoof these headers.
- Files: `src/lib/ratelimit.ts` (lines 97-112)
- Current mitigation: Comment explains premise ("assume proxy confiável"), but no runtime enforcement.
- Recommendations: 
  1. Document deployment requirement (must run behind trusted proxy: Vercel, Cloudflare, nginx with config, etc.).
  2. Add startup check: warn if running on localhost and Upstash is configured (likely misconfigured).
  3. Consider adding `X-Forwarded-Proto` validation to ensure HTTPS.

**Weak Common Passwords List Is Hardcoded & Outdated:**
- Risk: `COMMON_PASSWORDS` in `src/lib/schemas.ts` (lines 6-13) has ~40 passwords. Many real-world weak passwords not covered (e.g., "123456", "098765", "asdf").
- Files: `src/lib/schemas.ts` (lines 6-13)
- Current mitigation: Only catches ~40 common cases; bcrypt 72-byte limit helps, but not sufficient alone.
- Recommendations:
  1. Extend list to common Brazilian passwords (e.g., "cpf12345").
  2. Consider integrating with `have-i-been-pwned` API for real-time breach checking (requires internet).
  3. Or use a library like `zxcvbn` for entropy analysis instead of wordlist.

**Email Verification Token Can Be Brute-Forced (Low Risk):**
- Risk: `generateToken()` source not shown, but if it produces short tokens (< 32 bytes), an attacker with email verification link could brute-force. Schema stores `tokenHash`, which is good, but token generation strength unknown.
- Files: `src/lib/tokens.ts` (not read; only called from register/forgot-password)
- Current mitigation: Tokens stored as hash only (good). TTL is 24 hours (acceptable).
- Recommendations: Ensure `generateToken()` uses cryptographically secure random with >= 32 bytes entropy.

**No CSRF Protection on State-Changing API Routes:**
- Risk: POST/PUT/DELETE endpoints in `src/app/api/auth/` lack CSRF tokens. Relies on SameSite=Strict cookie + same-origin policy.
- Files: `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/lib/cookie-options.ts`
- Current mitigation: SameSite=Strict should block cross-site, but check cookie config.
- Recommendations: Verify `authCookieOptions()` sets `sameSite: 'strict'` (likely is, but not shown). Server Actions already have built-in CSRF protection, so only API routes at risk.

**Anthropic API Key Not Validated at Startup:**
- Risk: `ANTHROPIC_API_KEY` missing causes runtime error inside `getAnthropic()` when mentor is first called, not at app startup.
- Files: `src/lib/anthropic.ts` (lines 10-14)
- Impact: App appears healthy but mentor feature fails on first use.
- Recommendations: Validate critical env vars in Next.js config or a startup health check.

## Performance Bottlenecks

**N+1 Query Pattern in Category Fetching with Budget Data:**
- Problem: `listCategoriesWithBudget()` fetches all categories + includes budget, then does a separate `groupBy` on transactions. For 100 categories, this is 1 + 1 + (potentially 1 per budget calculation) = O(n).
- Files: `src/lib/actions/categories.ts` (lines 50-91), specifically lines 54-66
- Cause: Prisma groupBy is efficient, but could be optimized with a single aggregated query.
- Improvement path: Use Prisma raw query or aggregate with `_sum` in the category query to fetch budget + spending in one pass.

**Dashboard Loads All Transactions for Current Month:**
- Problem: `getDashboardData()` fetches all transactions in the current month (unbounded query), then slices first 5 for display.
- Files: `src/lib/actions/dashboard.ts` (lines 46-50)
- Cause: No `take: X` limit in Prisma query; if user has 10k transactions, all are loaded into memory.
- Improvement path: Add `take: 100` (or configurable limit) to `findMany` query, then slice for UI.

**Reports Query Builds Full Time Series Even When Months = 1:**
- Problem: `getReportsData()` always loops through `safeMonths` to build skeleton series, even if user requests only current month. 6-month default loads unnecessary data.
- Files: `src/lib/actions/reports.ts` (lines 74-83)
- Cause: Series skeleton built first, then data filled. For 1 month, 5 loops are wasted.
- Improvement path: Build series on-demand as transactions are processed, or lazy-load months.

**CSV Import Allocates Full Transaction Array Before Validation:**
- Problem: `importTransactions()` collects all `data.items` in memory, validates all categories upfront, then creates in batch. If user tries to import 5000 transactions, all are held in memory.
- Files: `src/lib/actions/transactions.ts` (lines 109-141)
- Cause: `createMany()` requires all data upfront; no streaming.
- Improvement path: For truly large imports (Wave 2+), consider splitting into batches of 100-200 records per transaction, or using PostgreSQL `COPY` for bulk insert via raw SQL.

## Fragile Areas

**Category Deletion Logic With Dependent Data:**
- Files: `src/lib/actions/categories.ts` (lines 130-148)
- Why fragile: Deleting a category requires checking transaction count AND monthlyFees count. If new related models are added (e.g., "CategoryRule"), deletion logic must be updated manually or category will orphan records.
- Safe modification: Before modifying category schema, search for all `where: { categoryId: ... }` queries. Keep a deletion checklist in schema comments.
- Test coverage: No tests found for cascade/restrict behavior.

**Budget Upsert Without Explicit Ownership Check:**
- Files: `src/lib/actions/budgets.ts` (lines 10-28)
- Why fragile: `upsertBudget()` checks category ownership but Prisma's `upsert` on unique `categoryId` could theoretically update another user's budget if unique constraint is global (not scoped to user). Schema has `@@unique([categoryId])` which is suspicious.
- Safe modification: Add explicit `userId` + `categoryId` composite unique constraint (see Tech Debt section).
- Test coverage: No test for multi-user isolation.

**Mentor Action Builds Financial Context Synchronously:**
- Files: `src/lib/actions/mentor.ts` (lines 29-115)
- Why fragile: `buildFinancialContext()` runs 5 parallel Prisma queries to fetch all user financial data. If user has 100k transactions, this could timeout or OOM.
- Safe modification: Add pagination/limits: max 1000 transactions, max 500 monthly fees, max 50 goals. Consider caching context for 5 minutes if same user asks multiple questions.
- Test coverage: No load tests with large datasets.

**Email Sending Fire-and-Forget Without Retry:**
- Files: `src/app/api/auth/register/route.ts` (lines 63-68), `src/app/api/auth/forgot-password/route.ts` (lines 44-49)
- Why fragile: Resend API failures are logged but ignored. User never knows email didn't send. No retry mechanism.
- Safe modification: Use job queue (Bull, Inngest) to retry failed emails. Or store email as pending + poll status.
- Test coverage: No mocking of Resend errors.

## Scaling Limits

**In-Memory Rate Limiter Fallback (Single-Process Only):**
- Current capacity: All requests on same process share `buckets` Map in `src/lib/ratelimit.ts`.
- Limit: Deploying to Vercel (serverless) or any multi-instance environment disables fallback; Upstash MUST be configured.
- Scaling path: Ensure Upstash Redis is provisioned before production deploy. Add startup check to error if Upstash env vars missing in production.
- Files: `src/lib/ratelimit.ts` (lines 18-26, 48-76)

**PostgreSQL Connection Pool Not Explicitly Configured:**
- Current capacity: Prisma default connection pool is 10 connections. Under heavy load (100+ concurrent requests), pool exhaustion possible.
- Limit: Breaks around ~50 simultaneous users making DB queries.
- Scaling path: Set `connection_limit` in Prisma schema datasource URL, or use PgBouncer for connection pooling.
- Files: `prisma.config.ts`, `src/prisma/schema.prisma`

**Upstash Rate Limit Bucket Cleanup Not Tuned:**
- Current capacity: Upstash handles cleanup, but Prisma doesn't. Expired tokens stay in DB indefinitely.
- Limit: No hard limit, but DB grows ~10-100 tokens/day per active user.
- Scaling path: Add periodic cleanup job (Inngest, cron) to delete tokens expired > 7 days old.

## Dependencies at Risk

**@anthropic-ai/sdk ^0.98.0 (Pinned Minor):**
- Risk: Allows patch updates automatically (0.98.x → 0.99.x possible). Major API changes could break mentorView if SDK changes message format.
- Files: `src/lib/actions/mentor.ts` (uses `Anthropic.messages.create()`), `src/lib/anthropic.ts`
- Impact: Message schema changes could silently fail.
- Migration plan: Pin to exact version (0.98.0) or set up integration tests that catch SDK changes.

**next 16.2.6 (Pinned Minor, Latest Major):**
- Risk: Next.js 16.x is current; 17.x coming. Server Actions API could change. Middleware API stabilizing.
- Files: All `"use server"` files
- Impact: Future major upgrade will require refactoring.
- Migration plan: Monitor Next.js 17 beta docs. Start testing in parallel environment 3+ months before 17 release.

**bcryptjs ^3.0.3 (Permissive Range):**
- Risk: Allows 3.0.3 → 4.0.0 with breaking changes possible.
- Files: `src/lib/actions/account.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`
- Impact: Password hashing could break; users locked out.
- Migration plan: Pin to 3.0.3, test 4.0.0 in dev first.

**resend ^6.12.4:**
- Risk: Resend API is young; major version changes frequent.
- Files: `src/lib/email.ts`, register/forgot-password routes
- Impact: Email sending silently fails if API changes.
- Migration plan: Test Resend upgrade in staging. Have fallback SMTP configured.

## Missing Critical Features

**No Two-Factor Authentication (2FA):**
- Problem: Only password + email verification. If email is compromised, attacker gains full access.
- Blocks: High-security use case (if users store sensitive financial data).
- Impact: Medium — acceptable for personal app, risky for shared accounts.

**No Audit Log / Transaction History:**
- Problem: User edits transaction, original value is lost. No way to see who changed what when.
- Blocks: Compliance (if needed), user accountability.
- Impact: Medium — Wave 1 scope, but Wave 2+ will need it.

**No Recurring Transaction Automation:**
- Problem: User manually re-enters same transaction monthly (e.g., salary, rent). No "repeat" feature.
- Blocks: User convenience; increases data entry errors.
- Impact: Noted in monthlyFees, but not for ad-hoc recurring transactions.

**No Multi-User Shared Budgets (Couples/Families):**
- Problem: Schema enforces single user per category. No way to share budget data with spouse.
- Blocks: Family finance use case.
- Impact: Limits market; acceptable for current Wave 1 scope.

## Test Coverage Gaps

**No Tests for Multi-User Isolation:**
- What's not tested: Can user A view/edit user B's transactions, categories, budgets? (Should not be able to.)
- Files: `src/lib/actions/transactions.ts`, `src/lib/actions/budgets.ts`, `src/lib/actions/categories.ts` all have `where: { userId }` checks, but no test verifies rejection of mismatched IDs.
- Risk: SQLi or authz bypass in production goes unnoticed.
- Priority: High

**No Tests for Rate Limiting:**
- What's not tested: Does rate limiter actually reject 6th request within 60 seconds? (Code says limit 5.)
- Files: `src/lib/ratelimit.ts`, `src/app/api/auth/login/route.ts`
- Risk: Rate limits silently fail; brute force attacks possible.
- Priority: High

**No Tests for CSV Parsing Edge Cases:**
- What's not tested: Unicode (emoji in description), very long fields, CSV with only quotes, NULL values.
- Files: `src/lib/csvImport.ts`
- Risk: Malformed CSV could crash parser or parse incorrectly.
- Priority: Medium

**No Tests for Decimal/Currency Precision:**
- What's not tested: Does `amount: 1.999999` round correctly in DB? Do KPI calculations sum precisely?
- Files: All transaction/budget/goal actions (using Prisma Decimal type)
- Risk: Rounding errors accumulate in financial calculations (e.g., $0.01 discrepancy after 1000 transactions).
- Priority: High

**No Tests for Session Revocation:**
- What's not tested: When password is reset, are ALL sessions revoked? Can old JWT still access data?
- Files: `src/app/api/auth/reset-password/route.ts`, `src/lib/sessions.ts`
- Risk: Session revocation logic broken silently.
- Priority: High

**No Tests for Anthropic/Mentor Failure Modes:**
- What's not tested: What happens if Anthropic API times out? Returns invalid JSON? If mentor rate limit exceeds, is error message user-friendly?
- Files: `src/lib/actions/mentor.ts`
- Risk: Silent failures; user sees stale UI state.
- Priority: Medium

---

*Concerns audit: 2026-05-31*
