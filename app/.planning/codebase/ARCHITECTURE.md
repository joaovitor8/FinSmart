<!-- refreshed: 2026-05-31 -->
# Architecture

**Analysis Date:** 2026-05-31

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│              Next.js 16 App Router (Root Layout)                     │
│                    `src/app/layout.tsx`                              │
│          ThemeProvider (dark default) + AuthProvider                 │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   ┌─────────────────┐  ┌──────────────────┐
   │  Public Pages   │  │  Auth Routes     │
   │  `/`, `/login`  │  │  /api/auth/*     │
   │  `/register`    │  │  JWT + Session   │
   │  `/forgot-pass` │  │  Management      │
   └─────────────────┘  └──────────────────┘
        │
        │ (redirect if authenticated)
        │
        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │         Authenticated App (/main/layout.tsx)                │
   │  Session validation: JWT + Prisma session lookup            │
   │       (Full auth check — middleware only verifies signature)│
   └───────┬───────────────────────────────────────────────────┘
           │
        ┌──┴──────────────────────────────────────────────────┐
        ▼                                                      ▼
   ┌───────────────────────────────┐      ┌──────────────────────────┐
   │  App Pages (Route Groups)      │      │  UI Layer (Components)   │
   │  in (pages) (/main/(pages))    │      │  `src/components/`       │
   │                                │      │                          │
   │ - dashboard                    │      │ ├─ app-shell.tsx        │
   │ - transactions                 │      │ ├─ app-sidebar.tsx      │
   │ - budget                       │      │ ├─ mobile-nav.tsx       │
   │ - goals                        │      │ ├─ transactions/        │
   │ - monthlyFees                  │      │ ├─ dashboard/           │
   │ - reports                      │      │ ├─ goals/              │
   │ - settings                     │      │ ├─ categories/         │
   │ - mentor                       │      │ ├─ reports/            │
   │                                │      │ ├─ monthlyFees/        │
   │ Each: async page → AppShell    │      │ ├─ settings/           │
   │       → *View component        │      │ ├─ mentor/             │
   └───────┬───────────────────────┘      │ └─ ui/ (shadcn)         │
           │                               └──────────────────────────┘
           │
           ▼ (parallel Promise.all)
   ┌────────────────────────────────────────────────────────────┐
   │           Server Actions Layer                             │
   │           `src/lib/actions/*.ts`                           │
   │                                                             │
   │ • transactions.ts   - create, update, delete, list, import │
   │ • dashboard.ts      - KPIs, recent txns, budgets, goals    │
   │ • categories.ts     - CRUD + icon/color management         │
   │ • goals.ts          - CRUD + progress tracking             │
   │ • monthlyFees.ts    - subscriptions management             │
   │ • budgets.ts        - spending limits per category         │
   │ • reports.ts        - monthly/category analytics           │
   │ • mentor.ts         - AI financial advisor (Anthropic)     │
   │ • account.ts        - profile, password, sessions          │
   │ • sessions.ts       - auth session management              │
   │                                                             │
   │ All: requireUserId() + Zod validation + revalidatePath()   │
   └────────────┬─────────────────────────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────────────────────────┐
   │         Data Layer (Prisma ORM)                            │
   │         PostgreSQL via prisma/adapter-pg                   │
   │         `src/lib/prisma.ts` (singleton)                    │
   │                                                             │
   │ Models:                                                     │
   │ • User (auth)                                              │
   │ • Session (JWT session tracking)                           │
   │ • EmailVerificationToken / PasswordResetToken              │
   │ • Category (user-created, INCOME/EXPENSE/BOTH)            │
   │ • Transaction (INCOME/EXPENSE with category)              │
   │ • Budget (monthly spending limit per category)            │
   │ • MonthlyFees (recurring subscriptions/bills)             │
   │ • Goal (savings targets with progress)                    │
   └────────────┬─────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │   PostgreSQL DB   │
        └───────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Root Layout | Initialize providers (themes, auth), Sonner toasts | `src/app/layout.tsx` |
| Auth Provider | Client-side auth state via `/api/auth/me`, useAuth hook | `src/contexts/AuthContext.tsx` |
| App Shell | Desktop sidebar + mobile nav wrapper, layout grid | `src/components/app-shell.tsx` |
| Page Components (async) | Server fetch via actions, pass data to view components | `src/app/main/(pages)/**/page.tsx` |
| View Components (client) | Render UI, manage local state, call server actions | `src/components/**/*View.tsx` |
| Form Components | react-hook-form + Zod, submit via server actions | `src/components/**/*add*.tsx` / `*edit*.tsx` |
| UI Library | shadcn/ui primitives (button, input, dialog, table, etc.) | `src/components/ui/*.tsx` |
| Server Actions | Business logic, auth check, Prisma queries, revalidation | `src/lib/actions/*.ts` |
| Auth (server) | JWT verify + session validate, getSession/getUserId/requireUserId | `src/lib/auth-server.ts` |
| Auth (crypto) | JWT sign/verify, session payload | `src/lib/auth.ts` |
| Middleware | Edge runtime: route protection, CSP headers | `src/proxy.ts` |
| Prisma Client | DB queries with auto-singleton pooling | `src/lib/prisma.ts` |

## Pattern Overview

**Overall:** Next.js 16 Server Components with Server Actions for mutations, Client Components for interactivity. Data flows server → client via serialization. Client forms trigger Server Actions via `useTransition` or direct calls (toast on error).

**Key Characteristics:**
- **RSC (React Server Components)** for page structure and initial data fetch
- **Server Actions** ("use server") for all mutations, auth-gated with `requireUserId()`
- **Zod schemas** shared: RHF validation on client, schema.parse() on server
- **Next.js cache revalidation** (`revalidatePath`) to bust stale data after mutations
- **DTOs not Prisma models** serialized to client (Decimal → number, Date → ISO string)
- **Session-based auth** with JWT cookie (httpOnly) + Prisma Session table for revocation
- **Middleware (proxy)** runs on Edge, does JWT signature check only; full validation in layout
- **Client context** (AuthContext) for runtime user check, not for data state (use Server Actions)

## Layers

**Public/Auth Pages:**
- Purpose: Login, register, password reset, landing page
- Location: `src/app/{login,register,forgot-password,reset-password,page.tsx}`
- Contains: Form pages with fetch-based submissions to `/api/auth/*`
- Depends on: Zod schemas, email/token utilities
- Used by: Unauthenticated users

**API Layer (Route Handlers):**
- Purpose: Auth endpoints (login, register, logout, verify email, password reset)
- Location: `src/app/api/auth/**/route.ts`
- Contains: POST handlers, bcrypt password check, Prisma user/session CRUD, JWT generation
- Depends on: Prisma, jose (JWT), bcryptjs
- Used by: Public auth forms, AuthProvider's `/api/auth/me` polling

**Authenticated App (Main Layout):**
- Purpose: Session guard; redirects to /login if no valid session
- Location: `src/app/main/layout.tsx`
- Contains: `getSession()` call with DB validation (full JWT + session check)
- Depends on: `auth-server.ts`
- Used by: All protected routes under /main

**Page Components (Server):**
- Purpose: Route handler; fetch data in parallel via Server Actions
- Location: `src/app/main/(pages)/{feature}/page.tsx` (e.g., dashboard, transactions)
- Contains: Async component, Promise.all([action1(), action2()]), renders AppShell + View
- Depends on: Server Actions (actions/*)
- Used by: Next.js router

**View Components (Client):**
- Purpose: Render paginated tables, charts, forms; manage UI state (filters, pagination, edit forms)
- Location: `src/components/{feature}/{feature}View.tsx`
- Contains: useState for local UI, useRouter for navigation, Server Action calls via toast
- Depends on: UI components, constants (icons, colors), format utilities
- Used by: Page components

**Server Actions (Business Logic):**
- Purpose: All mutations (create, update, delete, import), some queries (dashboard aggregates)
- Location: `src/lib/actions/{feature}.ts`
- Contains: `"use server"`, requireUserId(), Zod parsing, Prisma queries, DTOs, revalidatePath
- Depends on: Prisma, schemas, types (DTOs), format utilities
- Used by: Client components (forms, buttons) via direct import

**Auth Layer:**
- Purpose: JWT encoding/decoding, session creation/validation, user lookups
- Location: `src/lib/auth.ts` (crypto), `src/lib/auth-server.ts` (server-only)
- Contains: signToken, verifyToken, getSession, requireUserId, requireSession
- Depends on: jose (JWT), Prisma (for session validation)
- Used by: Routes, layouts, Server Actions, middleware

**Data Access (Prisma):**
- Purpose: ORM queries to PostgreSQL
- Location: `src/lib/prisma.ts` (singleton), `src/prisma/schema.prisma` (schema)
- Contains: PrismaClient with pg adapter, connection pooling
- Depends on: @prisma/client, pg driver, DATABASE_URL env var
- Used by: All Server Actions

## Data Flow

### Primary Request Path: Create Transaction

1. User on Transactions page clicks "Add" → opens form (client state in TransactionsView)
2. Form (AddTransaction, `src/components/transactions/addTransaction.tsx`) renders react-hook-form + Zod
3. User submits → `handleSubmit` calls `createTransaction(data)` Server Action
4. Server Action (`src/lib/actions/transactions.ts:createTransaction`)
   - `await requireUserId()` checks session (JWT + DB lookup)
   - `transactionSchema.parse(input)` validates
   - Confirms category ownership (prevent privilege escalation)
   - `prisma.transaction.create()` inserts row
   - `revalidatePath()` for /transactions, /dashboard, /budget
5. Client (AddTransaction) gets response; shows `toast.success()`, closes form, resets
6. Next.js re-renders affected pages (cache busted) on next request
7. TransactionsView fetches fresh data via `listTransactions()` on re-render

### Secondary Flow: Dashboard Load

1. User navigates to `/main/dashboard` → calls DashboardPage
2. DashboardPage (`src/app/main/(pages)/dashboard/page.tsx`) is async
3. Calls `await getDashboardData()` (Server Action in `src/lib/actions/dashboard.ts`)
4. Server Action: `requireUserId()` → parallel Prisma queries for transactions, goals, fees, categories
5. Aggregates in-memory (KPIs, category breakdown, recent 5 txns, budget progress)
6. Returns DashboardData DTO (all Decimals → numbers, Dates → ISO)
7. DashboardPage passes to `<DashboardView data={data} />` (client component)
8. DashboardView renders KPI cards, charts (via Recharts), budget widgets, recent txns

### Mentor AI Flow

1. User sends message in mentor chat (MentorView, client)
2. Calls `askMentor(history, userMessage)` Server Action
3. Server Action:
   - Checks rate limit: max 10 calls/min per user
   - Validates input with `askMentorSchema`
   - Builds financial context (queries User, Transactions, Goals, Fees, Categories for current month)
   - Aggregates to markdown string: KPIs, top expenses, budgets, goals
   - Calls Anthropic API with system prompt + context + message history
   - Returns markdown reply
4. Client receives text, appends to chat history, renders in UI

**State Management:**
- **Server state**: Prisma (source of truth)
- **Client temporary state**: useState in *View components (search filters, pagination, form modal open/close)
- **Client user state**: AuthContext (name, email, id) — fetched once on mount via `/api/auth/me`
- **Cache invalidation**: Middleware (Edge) checks JWT signature; layout checks DB; revalidatePath busts ISR

## Key Abstractions

**DTO (Data Transfer Object):**
- Purpose: Serialize Prisma models for client consumption
- Examples: `TransactionDTO`, `CategoryDTO`, `DashboardData`
- Pattern: Server Action returns DTO; client receives plain object (no Prisma runtime)
- File: `src/lib/types.ts`

**Schema (Zod):**
- Purpose: Validation for form input → server → DB
- Examples: `transactionSchema`, `categorySchema`, `goalCreateSchema`
- Pattern: RHF resolver on client, schema.parse() on server, shared type `z.infer<typeof schema>`
- File: `src/lib/schemas.ts`

**Server Action (with requireUserId):**
- Purpose: Auth-gated business logic
- Pattern: "use server" + `await requireUserId()` + Zod parse + Prisma query + revalidatePath
- Example: `src/lib/actions/transactions.ts:createTransaction`

**View Component (Client):**
- Purpose: Render page section with interactivity
- Pattern: useState for filters/pagination/modal state, Server Action calls, error/success toasts
- Example: `src/components/transactions/transactionsView.tsx`

**App Shell (Layout):**
- Purpose: Sidebar + mobile nav wrapper
- Pattern: Client component that provides container div with ml-64 on desktop, pb-20 on mobile
- File: `src/components/app-shell.tsx`, `src/components/app-sidebar.tsx`

## Entry Points

**Public Landing:**
- Location: `src/app/page.tsx`
- Triggers: URL `/`
- Responsibilities: Hero, features, nav to login/register, checks useAuth() to redirect to /main/dashboard if logged in

**Auth Endpoints:**
- Location: `src/app/api/auth/{login,register,logout,me,verify-email,forgot-password,reset-password}/route.ts`
- Triggers: POST from forms or AuthProvider polling
- Responsibilities: Validate credentials, create/revoke sessions, send emails, issue JWT

**Protected App:**
- Location: `src/app/main/layout.tsx`
- Triggers: Any route under /main
- Responsibilities: Call getSession(), redirect to /login if no valid session

**Page Routes:**
- Location: `src/app/main/(pages)/{feature}/page.tsx` (dashboard, transactions, budget, goals, etc.)
- Triggers: Sidebar/nav clicks, direct URL
- Responsibilities: Fetch initial data, render page

**Middleware (Edge):**
- Location: `src/proxy.ts` (registered as middleware via export config)
- Triggers: All requests matching matcher pattern
- Responsibilities: Verify JWT signature, redirect unauthenticated users, inject CSP headers

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop (default Next.js); Server Actions are async, DB calls queue
- **Global state:** `globalThis.prismaGlobal` for singleton PrismaClient (prevents connection pool exhaustion in dev)
- **Circular imports:** None detected; auth logic is layered (auth.ts → auth-server.ts → layout/actions)
- **Server-only context:** `"use server"` pragma on all Server Actions; `import "server-only"` in auth-server.ts, prisma.ts
- **Session invalidation:** Immediate via Session table lookup in `getSession()` — revoked session won't pass validation even if JWT is valid
- **Decimal arithmetic:** Prisma stores currency as Decimal(12,2); actions convert to number for DTO serialization
- **Date/timezone:** All dates in UTC; client displays in PT-BR locale via Intl.DateTimeFormat
- **Middleware (Edge):** No Prisma access (Edge runtime); middleware only verifies JWT signature; full validation in layout/action
- **Revalidation scope:** `revalidatePath()` in actions; affects ISR pages on next request, not immediate

## Anti-Patterns

### Prisma Model Returned to Client

**What happens:** Some imports of Prisma models leak to client side (e.g., if a Server Component accidentally exposes a model with Date/Decimal)
**Why it's wrong:** Prisma models serialize with runtime methods (Decimal.toString()); causes "Error: accessing Decimal on the server" or serialization errors
**Do this instead:** Always map Prisma models to DTOs (src/lib/types.ts) before returning from Server Actions. Example in `src/lib/actions/transactions.ts:toDTO()`

### Auth Logic in Client Context Only

**What happens:** If AuthContext is used as the sole auth check in a Server Component
**Why it's wrong:** AuthContext is client-side, browser-based, can be manipulated; Server Actions must always call `requireUserId()` independently
**Do this instead:** Use `requireUserId()` in every Server Action. AuthContext is for UI state only (showing user name, avatar) and client redirects; layouts use `getSession()`

### Skipping Zod on Server

**What happens:** Form data passed directly to Prisma without `schema.parse(input)`
**Why it's wrong:** Client validation is bypassed via dev tools; malicious input or type mismatches corrupt DB
**Do this instead:** Every Server Action input is parsed with Zod, including types inferred from schema (e.g., `transactionSchema.parse(data)`)

### Using useRouter in Form Submit Without Error Handling

**What happens:** Form calls Server Action, gets success, calls `router.push()` immediately
**Why it's wrong:** If Server Action throws, router.push() still runs, user sees UI for success but actually on old page
**Do this instead:** Wrap in try/catch, show toast.error() on error, only close modal/redirect on success. See `src/components/transactions/addTransaction.tsx:onSubmit()`

### Fetching Inside useEffect in Client Component

**What happens:** TransactionsView calls a Server Action inside useEffect to fetch initial data
**Why it's wrong:** Server Components (page.tsx) should fetch; client components should only query state or call mutations
**Do this instead:** Page component (`src/app/main/(pages)/transactions/page.tsx`) fetches via `listTransactions()`, passes as prop to TransactionsView

## Error Handling

**Strategy:** 
- Auth errors (no session, invalid token): Middleware redirects to /login; layout throws "Não autorizado"
- Validation errors (Zod): Server Action throws Error; client catches in try/catch, shows toast.error(err.message)
- DB errors (constraint, foreign key): Server Action throws; caught by caller
- External API errors (Anthropic): Server Action catches, returns fallback reply
- Network errors (client ↔ server): Not explicitly handled; relies on toast + try/catch

**Patterns:**
- Server Actions throw on error (Error message is sent to client)
- Client catches with try/catch (err instanceof Error ? err.message : generic)
- UI shows toast.error() with message
- User sees "Erro ao salvar." or specific validation message

## Cross-Cutting Concerns

**Logging:** Uses console.error/log in routes and actions; no centralized logger (could be added)
**Validation:** Zod schemas in `src/lib/schemas.ts`, parsed in every Server Action and client form
**Authentication:** requireUserId() in all mutations; getSession() in layouts; verifyToken() in middleware
**Authorization:** Always check ownership (e.g., "user can only see their transactions") in Prisma queries with `userId` filter
**Rate limiting:** `rateLimit(key, max, window)` in `/api/auth/login` and `askMentor()` to prevent abuse
**CSRF/Security:** CSP headers in proxy.ts; httpOnly auth cookie; form-action 'self'

---

*Architecture analysis: 2026-05-31*
