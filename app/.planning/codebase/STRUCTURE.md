# Codebase Structure

**Analysis Date:** 2026-05-31

## Directory Layout

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers: theme, auth, toaster)
│   ├── page.tsx                  # Landing page (public)
│   ├── globals.css               # Tailwind + theme variables
│   ├── (auth routes)/
│   │   ├── login/page.tsx        # Login form
│   │   ├── register/page.tsx     # Registration form
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── api/auth/                 # Auth endpoints
│   │   ├── login/route.ts        # POST → JWT + session
│   │   ├── register/route.ts     # POST → create user
│   │   ├── logout/route.ts       # POST → revoke session
│   │   ├── me/route.ts           # GET → user info for AuthProvider
│   │   ├── verify-email/route.ts # POST → mark email verified
│   │   ├── forgot-password/route.ts
│   │   └── reset-password/route.ts
│   └── main/                     # Protected app
│       ├── layout.tsx            # Session guard + redirect
│       └── (pages)/              # Route group
│           ├── dashboard/page.tsx
│           ├── transactions/page.tsx
│           ├── budget/page.tsx
│           ├── goals/page.tsx
│           ├── monthlyFees/page.tsx
│           ├── reports/page.tsx
│           ├── settings/page.tsx
│           └── mentor/page.tsx
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── checkbox.tsx
│   │   ├── radio-group.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── avatar.tsx
│   │   ├── switch.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── confirm-dialog.tsx    # Custom confirmation modal
│   │   └── sonner.tsx            # Toast provider
│   ├── app-shell.tsx             # Desktop sidebar + mobile nav wrapper
│   ├── app-sidebar.tsx           # Navigation sidebar (desktop)
│   ├── mobile-header.tsx         # Top bar (mobile)
│   ├── mobile-nav.tsx            # Bottom navigation (mobile)
│   ├── theme-toggle.tsx          # Dark/light switcher
│   ├── transactions/             # Feature components
│   │   ├── transactionsView.tsx  # Table + filters + pagination
│   │   ├── addTransaction.tsx    # Form modal (react-hook-form)
│   │   ├── editTransaction.tsx
│   │   └── importTransactionsSheet.tsx  # Bulk CSV import
│   ├── dashboard/
│   │   ├── dashboardView.tsx     # KPI cards + charts + budgets
│   │   ├── expenseChart.tsx      # Pie chart (Recharts)
│   │   └── budgetWidget.tsx      # Category spending vs limit
│   ├── goals/
│   │   ├── goalsView.tsx         # Goal list + progress bars
│   │   ├── addGoal.tsx           # Create modal
│   │   └── editGoal.tsx
│   ├── budget/
│   │   ├── budgetView.tsx        # Budget management
│   │   └── budgetDialog.tsx
│   ├── categories/
│   │   ├── categoryFormSheet.tsx # Create/edit category
│   │   ├── categorySelect.tsx    # Dropdown for transaction forms
│   │   └── budgetView.tsx
│   ├── monthlyFees/
│   │   ├── monthlyFeesView.tsx   # Subscriptions list
│   │   ├── addMonthlyFees.tsx
│   │   └── editMonthlyFees.tsx
│   ├── reports/
│   │   ├── reportsView.tsx       # Reports page
│   │   ├── monthlyBarChart.tsx   # Monthly income/expense
│   │   ├── balanceLineChart.tsx  # Balance over time
│   │   ├── periodFilter.tsx      # Date range picker
│   │   └── exportButton.tsx      # Export as CSV/JSON
│   ├── settings/
│   │   ├── settingsView.tsx      # Profile, password, sessions
│   │   └── sessionsCard.tsx      # Active devices + revoke
│   └── mentor/
│       └── mentorView.tsx        # Chat interface to AI advisor
│
├── lib/                          # Shared utilities
│   ├── actions/                  # Server Actions (mutations)
│   │   ├── transactions.ts       # CRUD + import
│   │   ├── categories.ts         # CRUD + icon/color
│   │   ├── goals.ts              # CRUD + progress
│   │   ├── budgets.ts            # Create/update/delete limits
│   │   ├── monthlyFees.ts        # Recurring subscriptions
│   │   ├── dashboard.ts          # Aggregated KPIs
│   │   ├── reports.ts            # Analytics queries
│   │   ├── mentor.ts             # Anthropic chat
│   │   ├── account.ts            # Profile, password, delete
│   │   └── sessions.ts           # Manage active sessions
│   ├── auth.ts                   # JWT sign/verify (jose)
│   ├── auth-server.ts            # getSession, requireUserId (server-only)
│   ├── prisma.ts                 # PrismaClient singleton
│   ├── sessions.ts               # createSession, validateSession, revoke
│   ├── tokens.ts                 # Email + password reset token generation
│   ├── email.ts                  # Email sending (Resend)
│   ├── types.ts                  # DTOs (TransactionDTO, CategoryDTO, etc.)
│   ├── schemas.ts                # Zod validators (shared client/server)
│   ├── format.ts                 # formatCurrency, formatDateBR, dateToInput
│   ├── constants.ts              # Icon maps, color palettes, catalogs
│   ├── csvImport.ts              # Parse CSV for bulk transaction import
│   ├── utils.ts                  # Misc utilities (cn, clsx, etc.)
│   ├── anthropic.ts              # Anthropic SDK config + model constant
│   ├── ratelimit.ts              # Rate limiting (in-memory or Redis)
│   ├── cookie-options.ts         # httpOnly cookie config
│   └── seed.ts                   # Database seed script (dev)
│
├── contexts/                     # React Context (client-side state)
│   └── AuthContext.tsx           # User state + isLoading
│
├── prisma/
│   └── schema.prisma             # Database schema (PostgreSQL)
│
└── proxy.ts                      # Next.js middleware (src/proxy.ts)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router files (pages, layouts, API routes)
- Contains: Route segments, page components, API handlers
- Key files: `layout.tsx` (root), `page.tsx` (landing), `api/auth/*` (endpoints), `main/layout.tsx` (session guard)

**`src/app/main/(pages)/`:**
- Purpose: Protected application pages, organized by feature
- Contains: Feature-specific page.tsx files that fetch data and render *View components
- Key files: `dashboard/page.tsx`, `transactions/page.tsx`, `budget/page.tsx`, etc.
- Pattern: Each page is async, calls Server Actions to fetch, renders AppShell + View

**`src/components/`:**
- Purpose: All React components (UI primitives, feature-specific views, forms, layouts)
- Contains: Presentational logic, client state (filters, modals), form handling
- Key files: `app-shell.tsx` (layout), `**/*View.tsx` (page views), `**/add*.tsx` / `*edit*.tsx` (forms)

**`src/components/ui/`:**
- Purpose: shadcn/ui component library
- Contains: Unstyled base components (Button, Input, Dialog, Table, etc.)
- Pattern: Imported by feature components; used in forms and layouts

**`src/lib/actions/`:**
- Purpose: Server Actions — all mutations and some queries
- Contains: "use server" functions, auth checks, validation, Prisma calls, DTOs
- Key files: One per feature (transactions.ts, goals.ts, etc.)
- Pattern: All export async functions, use requireUserId() + schema.parse() + revalidatePath

**`src/lib/`:**
- Purpose: Non-component shared logic (auth, DB, utilities)
- Contains: Auth helpers, Prisma singleton, Zod schemas, types, format utilities
- Key files: `auth.ts` (JWT), `auth-server.ts` (session), `prisma.ts` (DB), `schemas.ts` (validation)

**`src/prisma/`:**
- Purpose: Database schema
- Contains: Prisma schema file (models, enums, relations, indexes)
- Key file: `schema.prisma`

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Landing page (public, redirects if logged in)
- `src/app/layout.tsx`: Root layout (providers)
- `src/app/main/layout.tsx`: Protected app entry (session validation)
- `src/app/api/auth/login/route.ts`: Login endpoint (creates session, JWT)
- `src/proxy.ts`: Middleware (session verification, CSP, redirects)

**Configuration:**
- `src/prisma/schema.prisma`: Database schema
- `src/lib/constants.ts`: Icon maps, color palettes, catalogs
- `src/lib/cookie-options.ts`: httpOnly cookie settings
- `src/lib/anthropic.ts`: Anthropic API config

**Core Logic:**
- `src/lib/auth.ts`: JWT sign/verify
- `src/lib/auth-server.ts`: Session validation (requireUserId)
- `src/lib/prisma.ts`: Prisma singleton
- `src/lib/actions/*.ts`: All business logic (CRUD, queries, aggregates)

**Testing:**
- Not found; no test files present (testing planned for future waves)

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (mandatory Next.js name)
- Layout files: `layout.tsx` (mandatory)
- API routes: `route.ts` (mandatory)
- Middleware: `proxy.ts` (custom name, registered in export config)
- Components: PascalCase, `*View.tsx` for page views, `add*.tsx` / `edit*.tsx` for modals
- Server Actions: `*.ts` in `src/lib/actions/`, camelCase function names
- Utilities: `*.ts` in `src/lib/`, camelCase function names
- Schemas: `schemas.ts` (single file, many schemas)
- Types/DTOs: `types.ts` (single file, exported types)

**Directories:**
- Feature folders: kebab-case or camelCase (e.g., `transactions`, `monthlyFees`)
- Route segments: kebab-case (e.g., `/forgot-password`, `/reset-password`)
- Grouped routes: parentheses `(pages)` to avoid URL segment

## Where to Add New Code

**New Feature (e.g., Investments):**

1. **Database:**
   - Add model to `src/prisma/schema.prisma`
   - Run migration (not included in this codebase map)

2. **Backend Logic:**
   - Create `src/lib/actions/investments.ts`
   - Export async functions: listInvestments(), createInvestment(), updateInvestment(), deleteInvestment()
   - Use `requireUserId()`, schema.parse(), Prisma queries, revalidatePath()
   - Create DTO in `src/lib/types.ts` (e.g., InvestmentDTO)

3. **Validation:**
   - Add investmentSchema to `src/lib/schemas.ts`
   - Use Zod for field validation (amount, name, date, etc.)

4. **UI:**
   - Create `src/components/investments/investmentsView.tsx` (client, useState for filters/modals)
   - Create `src/components/investments/addInvestment.tsx` (form, react-hook-form + Zod)
   - Create `src/components/investments/editInvestment.tsx` (edit form)
   - Use existing UI primitives from `src/components/ui/`

5. **Route:**
   - Create `src/app/main/(pages)/investments/page.tsx` (async, fetch + render)
   - Call actions to fetch data, pass to InvestmentsView
   - Wrap with AppShell

6. **Navigation:**
   - Update `src/components/app-sidebar.tsx` to add link to /main/investments

**New Component/Module (e.g., Export to PDF):**
- Create `src/lib/exportPdf.ts` (utility, not a Server Action)
- Import and call from client components or Server Actions
- Place in `src/lib/` (not actions, since it's not a mutation endpoint)

**Utilities & Helpers:**
- Shared formatting: `src/lib/format.ts`
- Constants (colors, icons): `src/lib/constants.ts`
- Type definitions: `src/lib/types.ts`
- Validation schemas: `src/lib/schemas.ts`

## Special Directories

**`src/components/ui/`:**
- Purpose: shadcn/ui component library
- Generated: Yes (from shadcn/ui CLI)
- Committed: Yes (committed to repo for reproducibility)
- Notes: Don't edit directly unless bugfixing; prefer shadcn/ui upgrades

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (npm install or pnpm install)
- Committed: No (.gitignore)

**`src/prisma/`:**
- Purpose: Prisma schema and migrations
- Generated: Migrations auto-generated (not in this codebase)
- Committed: schema.prisma yes, migrations (if tracked) yes

**`.next/`:**
- Purpose: Build output (development)
- Generated: Yes (next build / next dev)
- Committed: No (.gitignore)

**`public/`:**
- Purpose: Static assets (favicon, logo)
- Contains: icon.svg
- Committed: Yes

---

*Structure analysis: 2026-05-31*
