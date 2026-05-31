<!-- GSD:project-start source:PROJECT.md -->

## Project

**FinSmart — Hardening de Segurança**

FinSmart é um app pessoal de controle financeiro em Next.js 16 + Prisma 7 + PostgreSQL, com auth caseiro (JWT + bcrypt), Server Actions para mutações e um "Mentor IA" via Anthropic. O produto-base já está completo (registro/login, transações, categorias, orçamentos, metas, mensalidades, relatórios, mentor, settings, PWA, import CSV). Este milestone existe porque o autor construiu o app sem se aprofundar em segurança e quer auditar e endurecer todas as rotas e regras antes de qualquer evolução futura.

**Core Value:** Garantir que **um usuário nunca acesse nem corrompa dados de outro** e que **o app resista a abusos triviais** (brute force, XSS, CSRF, requests sem proxy) — sem trocar a stack nem reescrever o auth.

### Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + Prisma 7 + PostgreSQL + Tailwind v4 + shadcn/ui. Auth com `jose` e `bcryptjs`. Sem trocar nada disso.
- **Padrões obrigatórios**: Server Actions em `src/lib/actions/*`, schemas em `src/lib/schemas.ts`, helpers server-only em `src/lib/auth-server.ts`, forms com RHF + zod.
- **Idioma**: comentários e mensagens em PT-BR, curtos.
- **Sem usuários ainda**: breaking changes são livres — migrações destrutivas no Prisma são aceitáveis (`db push --force-reset`).
- **Solo developer**: o autor é o único executor; agentes do GSD operam no mesmo repo. Fluxo de PRs continua existindo (último commit foi merge da branch `usando-claude`).
- **Custo de IA**: o app já paga Anthropic pelo Mentor. Modelos do GSD devem ser eficientes, não os mais caros, salvo onde profundidade compensar.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript 6.0.3 - Type-safe application code throughout
- JavaScript - Configuration files (eslint.config.mjs, postcss.config.mjs)

## Runtime

- Node.js (versions specified via .nvmrc or engine field - not configured in package.json)
- npm - Managing dependencies
- Lockfile: package-lock.json present (v3 format)

## Frameworks

- Next.js 16.2.6 - Full-stack web framework (App Router, Server Actions, API routes)
- React 19.2.6 - UI library with Server Components support
- React DOM 19.2.6 - DOM rendering
- react-hook-form 7.76.1 - Form state management and validation
- @hookform/resolvers 5.4.0 - Integration layer for Zod validation
- zod 4.4.3 - Schema validation and TypeScript inference
- Radix UI 1.4.3 - Accessible component primitives
- @radix-ui/* (avatar, checkbox, dialog, dropdown-menu, label, progress, radio-group, select, separator, slot, switch) - Specific component library
- shadcn 4.8.0 - Pre-built component collection builder
- Tailwind CSS 4.3.0 (via @tailwindcss/postcss 4.3.0) - Utility-first CSS framework
- class-variance-authority 0.7.1 - Type-safe variant composition
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.6.0 - Intelligent Tailwind class merging
- lucide-react 1.16.0 - Icon library
- recharts 3.8.1 - React charts library (used in Dashboard, Reports)
- next-themes 0.4.6 - Dark/light mode support (configured with dark default)
- sonner 2.0.7 - Toast notification library
- Not detected in dependencies (integration/unit tests likely use Node.js native or unpublished test runners)
- eslint 10.4.0 - Code quality and linting
- eslint-config-next 16.2.6 - Next.js ESLint configuration preset
- @types/* (node, react, react-dom, bcryptjs, pg) - TypeScript type definitions for common libraries

## Key Dependencies

- @prisma/client 7.8.0 - ORM for database access
- @prisma/adapter-pg 7.8.0 - PostgreSQL adapter for Prisma
- pg 8.21.0 - Native PostgreSQL driver (required by adapter-pg)
- jose 6.2.3 - JWT creation and verification (HS256 algorithm)
- bcryptjs 3.0.3 - Password hashing (bcrypt implementation in pure JS)
- resend 6.12.4 - Email service for transactional emails (verification, password reset)
- @upstash/ratelimit 2.0.8 - Distributed rate limiting (sliding window algorithm)
- @upstash/redis 1.38.0 - Redis client for rate limiting and potentially caching
- @anthropic-ai/sdk 0.98.0 - Anthropic Claude API integration (Mentor feature)
- date-fns 4.3.0 - Date manipulation and formatting

## Configuration

- Configuration via .env file (not committed to git)
- Required variables documented in `ejemplo.env`
- `next.config.ts` - Security headers (HSTS, X-Frame-Options, CSP context)
- `tsconfig.json` - TypeScript strict mode enabled, path aliases (@/* → root)
- `prisma.config.ts` - Prisma configuration pointing to `src/prisma/schema.prisma`
- `components.json` - shadcn/ui configuration (Tailwind, Radix UI, Lucide icons)
- `postcss.config.mjs` - PostCSS processing pipeline
- `eslint.config.mjs` - ESLint rules (Next.js core web vitals, TypeScript)

## Platform Requirements

- Node.js (version unspecified, check .nvmrc or infer from package-lock)
- npm for dependency management
- PostgreSQL database (local or via connection string)
- Deployment: Vercel (inferred from Next.js 16 and CSP/HSTS patterns)
- PostgreSQL database (production instance)
- Upstash Redis (mandatory for distributed rate limiting in production)
- Resend account for email delivery
- Anthropic API key for Claude integration

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- **Components:** PascalCase with `.tsx` extension. Descriptive names: `categoryFormSheet.tsx`, `budgetDialog.tsx`, `app-sidebar.tsx`
- **Server Actions:** camelCase with `.ts` extension. Grouped by domain in `/src/lib/actions/`: `transactions.ts`, `categories.ts`, `account.ts`, `goals.ts`
- **Type/Schema Files:** camelCase singular. `schemas.ts`, `types.ts`, `constants.ts`
- **Utilities:** camelCase. Examples: `auth-server.ts`, `format.ts`, `prisma.ts`
- **Page Routes:** kebab-case folders with `page.tsx`. Example: `/app/main/(pages)/transactions/page.tsx`
- **Server Actions (top-level exports):** camelCase, descriptive, action-oriented verbs. Examples: `createTransaction()`, `updateCategory()`, `listTransactions()`, `importTransactions()`, `deleteAccount()`
- **Internal helpers:** camelCase. Examples: `toDTO()`, `toCategoryDTO()`, `currentMonthRange()`, `isWeakPassword()`
- **React event handlers:** Prefixed with `handle`. Examples: `handleLogin()`, `handleSubmit()`, `onOpenChange()`
- **Type guards and validators:** Prefixed with `is` or verb form. Examples: `isWeakPassword()`, `validateSession()`
- **Local state (React):** camelCase. Examples: `loading`, `isEdit`, `email`, `password`
- **Destructured object properties:** camelCase
- **Collections:** Use Set for uniqueness checking (`ownedSet`), Map for lookups (`byCategory`)
- **Boolean flags:** Prefix with `is` or use plain adjective. Examples: `isEdit`, `loading`, `valid`
- **DTOs (Data Transfer Objects):** Suffix with `DTO`. Examples: `TransactionDTO`, `CategoryDTO`, `CategoryWithBudgetDTO`, `GoalDTO`
- **Input types from Zod:** Suffix with `Input`. Examples: `TransactionInput`, `CategoryInput`, `RegisterInput`
- **Zod schemas:** Named descriptively, exported with suffix `Schema`. Examples: `transactionSchema`, `categorySchema`, `loginSchema`
- **Internal helper types:** Inline with `type` keyword or descriptive name. Example: `type DbTransaction` for database shape
- **Enums from Zod:** Suffix with `Enum`. Examples: `transactionTypeEnum`, `goalColorEnum`

## Code Style

- **Tool:** ESLint (eslint-config-next core-web-vitals + typescript configs)
- **Indent:** 2 spaces (standard Next.js config)
- **Quotes:** Double quotes in JSX attributes, config files
- **Line length:** Not strictly enforced but prefer descriptive names over abbreviations
- **Semicolons:** Present in all statements
- **Trailing commas:** Used in multi-line structures
- **Tool:** ESLint 10.4.0 with Next.js recommended configs
- **Config file:** `eslint.config.mjs` (flat config format)
- **Active rules:** Next.js Core Web Vitals + TypeScript type safety
- **Ignores:** `.next/`, `out/`, `build/`, `next-env.d.ts`
- **Run command:** `npm run lint`
- **Target:** ES2017
- **JSX mode:** react-jsx
- **Strict mode:** Enabled (`strict: true`)
- **Module resolution:** bundler (Next.js 16 standard)
- **Path alias:** `@/*` maps to `/` (root of repo)

## Import Organization

- `@/*` — Root of repository, used throughout to import from `src/lib/`, `src/components/`, etc.

## Error Handling

- Call `requireUserId()` or `requireSession()` to enforce authentication, which throws "Não autorizado" if not authenticated
- Throw `Error()` for validation failures or business logic violations
- Example errors:
- Catch errors from server actions or fetch calls
- Display via `toast.error()` (Sonner library)
- Extract message: `err instanceof Error ? err.message : "Erro ao salvar."`
- Example (from `categoryFormSheet.tsx`):
- Zod `.parse()` throws `ZodError` on invalid input — server actions catch and throw as Error for client
- Custom refinements add user-friendly messages
- Example (from `schemas.ts`):

## Logging

- Minimal logging in codebase — errors bubble up as exceptions
- Comments explain complex logic (see next section)
- Server actions silently process; errors communicated back to client

## Comments

- Inline comments in Portuguese-BR for non-obvious logic or design decisions
- SHORT comments, no docstrings (user preference per memory file)
- Explain the WHY, not the WHAT
- `// Headers de segurança estáticos. O CSP NÃO está aqui — fica em src/proxy.ts porque depende de nonce gerado por request.` (next.config.ts)
- `// Top senhas triviais. Lista pequena de propósito — pega os piores casos sem virar maintenance burden.` (schemas.ts)
- `// bcrypt trunca em 72 bytes; capar previne ambiguidade.` (schemas.ts)
- `// Evita duplicar nome (constraint @@unique cobre, mas damos mensagem amigável)` (actions/categories.ts)
- `// Coleta os categoryIds únicos e valida todos de uma vez` (actions/transactions.ts)
- Minimal use — rarely found in codebase
- When used, inline comment style preferred over multi-line blocks

## Function Design

- Small, focused functions (10-30 lines typical for actions)
- Helpers extracted (e.g., `toDTO()`, `currentMonthRange()`)
- **Server Actions:** Accept `input: unknown`, validate with Zod schema immediately, then use typed data
- **Helper functions:** Typed parameters
- **Event handlers:** Use React event types or typed data objects
- **Async Server Actions:** Most return void or minimal data (void triggers `revalidatePath()`)
- **Query actions:** Return typed DTOs or arrays. Example: `async function listTransactions(): Promise<TransactionDTO[]>`
- **Mutation actions with output:** Return object with relevant data. Example: `importTransactions()` returns `{ imported: number }`

## Module Design

- **Server Actions:** Named exports only (no default exports)
- **Type definitions:** Named type exports for use in components
- **Constants:** Named exports for icon maps, color options, etc.
- Not used extensively
- Main entry points: `src/lib/actions/`, each domain has its own file
- `src/lib/schemas.ts` — All Zod schemas + inferred input types
- `src/lib/types.ts` — DTOs and custom types (serializable for client)
- `src/lib/actions/{domain}.ts` — All mutations/queries for that domain (categories, transactions, etc.)
- `src/lib/constants.ts` — UI metadata (icon maps, color palettes, catalogs)
- `src/components/{domain}/` — Feature-specific components grouped by domain

## Form Handling

- Define `onSubmit(data: ValidatedType)` async function
- Wrap server action in try/catch
- Set loading state during submission
- Use `toast.success()` or `toast.error()` for feedback
- Call `reset()` if needed

## Date/Time Handling

- Dates accepted as strings from form input
- Convert to UTC using `dateInputToUTC()` helper before DB insert
- Store in DB as `Date` (Prisma handles)
- Return as ISO string (`.toISOString()`) in DTOs for client

## Decimal/Money Handling

- Zod validates as `z.coerce.number().positive()`
- Prisma stores as `Decimal` type (avoids floating-point errors)
- Convert to number in DTO: `Number(t.amount.toString())`
- Client works with plain numbers

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- **RSC (React Server Components)** for page structure and initial data fetch
- **Server Actions** ("use server") for all mutations, auth-gated with `requireUserId()`
- **Zod schemas** shared: RHF validation on client, schema.parse() on server
- **Next.js cache revalidation** (`revalidatePath`) to bust stale data after mutations
- **DTOs not Prisma models** serialized to client (Decimal → number, Date → ISO string)
- **Session-based auth** with JWT cookie (httpOnly) + Prisma Session table for revocation
- **Middleware (proxy)** runs on Edge, does JWT signature check only; full validation in layout
- **Client context** (AuthContext) for runtime user check, not for data state (use Server Actions)

## Layers

- Purpose: Login, register, password reset, landing page
- Location: `src/app/{login,register,forgot-password,reset-password,page.tsx}`
- Contains: Form pages with fetch-based submissions to `/api/auth/*`
- Depends on: Zod schemas, email/token utilities
- Used by: Unauthenticated users
- Purpose: Auth endpoints (login, register, logout, verify email, password reset)
- Location: `src/app/api/auth/**/route.ts`
- Contains: POST handlers, bcrypt password check, Prisma user/session CRUD, JWT generation
- Depends on: Prisma, jose (JWT), bcryptjs
- Used by: Public auth forms, AuthProvider's `/api/auth/me` polling
- Purpose: Session guard; redirects to /login if no valid session
- Location: `src/app/main/layout.tsx`
- Contains: `getSession()` call with DB validation (full JWT + session check)
- Depends on: `auth-server.ts`
- Used by: All protected routes under /main
- Purpose: Route handler; fetch data in parallel via Server Actions
- Location: `src/app/main/(pages)/{feature}/page.tsx` (e.g., dashboard, transactions)
- Contains: Async component, Promise.all([action1(), action2()]), renders AppShell + View
- Depends on: Server Actions (actions/*)
- Used by: Next.js router
- Purpose: Render paginated tables, charts, forms; manage UI state (filters, pagination, edit forms)
- Location: `src/components/{feature}/{feature}View.tsx`
- Contains: useState for local UI, useRouter for navigation, Server Action calls via toast
- Depends on: UI components, constants (icons, colors), format utilities
- Used by: Page components
- Purpose: All mutations (create, update, delete, import), some queries (dashboard aggregates)
- Location: `src/lib/actions/{feature}.ts`
- Contains: `"use server"`, requireUserId(), Zod parsing, Prisma queries, DTOs, revalidatePath
- Depends on: Prisma, schemas, types (DTOs), format utilities
- Used by: Client components (forms, buttons) via direct import
- Purpose: JWT encoding/decoding, session creation/validation, user lookups
- Location: `src/lib/auth.ts` (crypto), `src/lib/auth-server.ts` (server-only)
- Contains: signToken, verifyToken, getSession, requireUserId, requireSession
- Depends on: jose (JWT), Prisma (for session validation)
- Used by: Routes, layouts, Server Actions, middleware
- Purpose: ORM queries to PostgreSQL
- Location: `src/lib/prisma.ts` (singleton), `src/prisma/schema.prisma` (schema)
- Contains: PrismaClient with pg adapter, connection pooling
- Depends on: @prisma/client, pg driver, DATABASE_URL env var
- Used by: All Server Actions

## Data Flow

### Primary Request Path: Create Transaction

### Secondary Flow: Dashboard Load

### Mentor AI Flow

- **Server state**: Prisma (source of truth)
- **Client temporary state**: useState in *View components (search filters, pagination, form modal open/close)
- **Client user state**: AuthContext (name, email, id) — fetched once on mount via `/api/auth/me`
- **Cache invalidation**: Middleware (Edge) checks JWT signature; layout checks DB; revalidatePath busts ISR

## Key Abstractions

- Purpose: Serialize Prisma models for client consumption
- Examples: `TransactionDTO`, `CategoryDTO`, `DashboardData`
- Pattern: Server Action returns DTO; client receives plain object (no Prisma runtime)
- File: `src/lib/types.ts`
- Purpose: Validation for form input → server → DB
- Examples: `transactionSchema`, `categorySchema`, `goalCreateSchema`
- Pattern: RHF resolver on client, schema.parse() on server, shared type `z.infer<typeof schema>`
- File: `src/lib/schemas.ts`
- Purpose: Auth-gated business logic
- Pattern: "use server" + `await requireUserId()` + Zod parse + Prisma query + revalidatePath
- Example: `src/lib/actions/transactions.ts:createTransaction`
- Purpose: Render page section with interactivity
- Pattern: useState for filters/pagination/modal state, Server Action calls, error/success toasts
- Example: `src/components/transactions/transactionsView.tsx`
- Purpose: Sidebar + mobile nav wrapper
- Pattern: Client component that provides container div with ml-64 on desktop, pb-20 on mobile
- File: `src/components/app-shell.tsx`, `src/components/app-sidebar.tsx`

## Entry Points

- Location: `src/app/page.tsx`
- Triggers: URL `/`
- Responsibilities: Hero, features, nav to login/register, checks useAuth() to redirect to /main/dashboard if logged in
- Location: `src/app/api/auth/{login,register,logout,me,verify-email,forgot-password,reset-password}/route.ts`
- Triggers: POST from forms or AuthProvider polling
- Responsibilities: Validate credentials, create/revoke sessions, send emails, issue JWT
- Location: `src/app/main/layout.tsx`
- Triggers: Any route under /main
- Responsibilities: Call getSession(), redirect to /login if no valid session
- Location: `src/app/main/(pages)/{feature}/page.tsx` (dashboard, transactions, budget, goals, etc.)
- Triggers: Sidebar/nav clicks, direct URL
- Responsibilities: Fetch initial data, render page
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

### Auth Logic in Client Context Only

### Skipping Zod on Server

### Using useRouter in Form Submit Without Error Handling

### Fetching Inside useEffect in Client Component

## Error Handling

- Auth errors (no session, invalid token): Middleware redirects to /login; layout throws "Não autorizado"
- Validation errors (Zod): Server Action throws Error; client catches in try/catch, shows toast.error(err.message)
- DB errors (constraint, foreign key): Server Action throws; caught by caller
- External API errors (Anthropic): Server Action catches, returns fallback reply
- Network errors (client ↔ server): Not explicitly handled; relies on toast + try/catch
- Server Actions throw on error (Error message is sent to client)
- Client catches with try/catch (err instanceof Error ? err.message : generic)
- UI shows toast.error() with message
- User sees "Erro ao salvar." or specific validation message

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
