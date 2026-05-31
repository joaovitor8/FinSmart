# External Integrations

**Analysis Date:** 2026-05-31

## APIs & External Services

**AI/LLM:**
- Anthropic Claude - Mentor feature (financial coaching via AI)
  - SDK/Client: @anthropic-ai/sdk 0.98.0
  - Auth: ANTHROPIC_API_KEY (environment variable)
  - Implementation: `src/lib/anthropic.ts` - Singleton cached client
  - Model: claude-opus-4-7 (configurable via CLAUDE_MODEL env)
  - Used by: `src/lib/actions/mentor.ts` (Server Action)

**Email Delivery:**
- Resend - Transactional email service
  - SDK/Client: resend 6.12.4
  - Auth: RESEND_API_KEY (environment variable)
  - Implementation: `src/lib/email.ts` - Cached Resend client with HTML email templates
  - From address: EMAIL_FROM (default: "FinSmart <onboarding@resend.dev>")
  - Endpoints:
    - Email verification: `src/lib/email.ts#sendVerificationEmail()` → POST /emails
    - Password reset: `src/lib/email.ts#sendPasswordResetEmail()` → POST /emails
  - Used by: 
    - `src/app/api/auth/register/route.ts` - Sends verification email on signup
    - `src/app/api/auth/forgot-password/route.ts` - Sends password reset email

## Data Storage

**Databases:**
- PostgreSQL
  - Version: Managed via @prisma/adapter-pg 7.8.0 (supports Postgres 11+)
  - Connection: DATABASE_URL environment variable
  - Client: @prisma/client 7.8.0 (with @prisma/adapter-pg)
  - Driver: pg 8.21.0 (native node-postgres driver)
  - Schema location: `src/prisma/schema.prisma`
  - Manages: Users, Sessions, Transactions, Categories, Budgets, Goals, Monthly Fees, Tokens (email verification, password reset)

**File Storage:**
- Local filesystem only - No cloud storage integration detected

**Caching:**
- Upstash Redis (optional in dev, required in production)
  - Connection: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN environment variables
  - Client: @upstash/redis 1.38.0
  - Purpose: Distributed rate limiting for serverless environments
  - Fallback: In-memory bucket map when Upstash not configured (development only)
  - Used by: `src/lib/ratelimit.ts` - Sliding window rate limiting

## Authentication & Identity

**Auth Provider:**
- Custom implementation (server-side JWT-based)
  - Architecture: Stateful sessions with JWT tokens
  - Token library: jose 6.2.3
  - Algorithm: HS256 (HMAC-SHA256)
  - Secret: JWT_SECRET environment variable
  - Session lifetime: 7 days (configured in `src/lib/auth.ts#signToken()`)
  - Cookie: auth_token (HttpOnly, SameSite, Secure in production)

**Implementation Details:**
- `src/lib/auth.ts` - JWT signing/verification (signature only)
- `src/lib/auth-server.ts` - Server session retrieval and validation
- `src/lib/sessions.ts` - Session lifecycle (create, validate, revoke)
- `src/lib/tokens.ts` - Token generation and hashing (email verification, password reset)
- `src/app/api/auth/*` - API routes for login, register, logout, email verification, password reset, forgot-password
- Password hashing: bcryptjs 3.0.3 (bcrypt algorithm)
- Token storage: Tokens stored as SHA256 hashes in database (raw token in email only, never in DB)

**Email Verification:**
- Flow: Send verification email → User clicks link → API verifies token hash → Mark email verified
- Token lifecycle: 24 hours expiry
- Implementation: `src/app/api/auth/verify-email/route.ts`

**Password Reset:**
- Flow: Forgot password → Send reset email → User clicks link → Reset password form → Update password
- Token lifecycle: 1 hour expiry
- Implementation: `src/app/api/auth/forgot-password/route.ts` and `src/app/api/auth/reset-password/route.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar integration

**Logs:**
- Console logging only (via JavaScript console in server actions and API routes)
- No structured logging framework detected

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from Next.js 16, security headers pattern, serverless-compatible rate limiting)

**CI Pipeline:**
- Not detected in repository configuration

## Environment Configuration

**Required env vars:**
- DATABASE_URL - PostgreSQL connection string (format: postgresql://user:pass@host:port/db)
- JWT_SECRET - HMAC-SHA256 secret for token signing (recommended: `openssl rand -base64 48`)
- ANTHROPIC_API_KEY - Anthropic/Claude API key
- UPSTASH_REDIS_REST_URL - Upstash Redis REST endpoint
- UPSTASH_REDIS_REST_TOKEN - Upstash Redis REST token
- RESEND_API_KEY - Resend API key
- EMAIL_FROM - Sender email address (default: "FinSmart <onboarding@resend.dev>")
- APP_URL - Public application URL (used in email links, default: "http://localhost:3000")

**Optional env vars:**
- CLAUDE_MODEL - Override Claude model (default: "claude-opus-4-7")
- NODE_ENV - Set to "production" to enforce Upstash requirement

**Secrets location:**
- Development: .env file (ignored by git)
- Production: Vercel environment variables dashboard (or equivalent platform)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Email callbacks via Resend webhooks (not implemented in visible code)

## Rate Limiting

**Implementation:** `src/lib/ratelimit.ts`
- Algorithm: Sliding window via Upstash Redis (distributed) or in-memory (fallback)
- Usage: Applied to auth endpoints (register, login, password reset, forgot-password)
- Client IP extraction: Respects X-Real-IP and X-Forwarded-For headers (requires trusted proxy)

---

*Integration audit: 2026-05-31*
