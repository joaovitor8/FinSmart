# Coding Conventions

**Analysis Date:** 2026-05-31

## Naming Patterns

**Files:**
- **Components:** PascalCase with `.tsx` extension. Descriptive names: `categoryFormSheet.tsx`, `budgetDialog.tsx`, `app-sidebar.tsx`
- **Server Actions:** camelCase with `.ts` extension. Grouped by domain in `/src/lib/actions/`: `transactions.ts`, `categories.ts`, `account.ts`, `goals.ts`
- **Type/Schema Files:** camelCase singular. `schemas.ts`, `types.ts`, `constants.ts`
- **Utilities:** camelCase. Examples: `auth-server.ts`, `format.ts`, `prisma.ts`
- **Page Routes:** kebab-case folders with `page.tsx`. Example: `/app/main/(pages)/transactions/page.tsx`

**Functions:**
- **Server Actions (top-level exports):** camelCase, descriptive, action-oriented verbs. Examples: `createTransaction()`, `updateCategory()`, `listTransactions()`, `importTransactions()`, `deleteAccount()`
- **Internal helpers:** camelCase. Examples: `toDTO()`, `toCategoryDTO()`, `currentMonthRange()`, `isWeakPassword()`
- **React event handlers:** Prefixed with `handle`. Examples: `handleLogin()`, `handleSubmit()`, `onOpenChange()`
- **Type guards and validators:** Prefixed with `is` or verb form. Examples: `isWeakPassword()`, `validateSession()`

**Variables:**
- **Local state (React):** camelCase. Examples: `loading`, `isEdit`, `email`, `password`
- **Destructured object properties:** camelCase
- **Collections:** Use Set for uniqueness checking (`ownedSet`), Map for lookups (`byCategory`)
- **Boolean flags:** Prefix with `is` or use plain adjective. Examples: `isEdit`, `loading`, `valid`

**Types:**
- **DTOs (Data Transfer Objects):** Suffix with `DTO`. Examples: `TransactionDTO`, `CategoryDTO`, `CategoryWithBudgetDTO`, `GoalDTO`
- **Input types from Zod:** Suffix with `Input`. Examples: `TransactionInput`, `CategoryInput`, `RegisterInput`
- **Zod schemas:** Named descriptively, exported with suffix `Schema`. Examples: `transactionSchema`, `categorySchema`, `loginSchema`
- **Internal helper types:** Inline with `type` keyword or descriptive name. Example: `type DbTransaction` for database shape
- **Enums from Zod:** Suffix with `Enum`. Examples: `transactionTypeEnum`, `goalColorEnum`

## Code Style

**Formatting:**
- **Tool:** ESLint (eslint-config-next core-web-vitals + typescript configs)
- **Indent:** 2 spaces (standard Next.js config)
- **Quotes:** Double quotes in JSX attributes, config files
- **Line length:** Not strictly enforced but prefer descriptive names over abbreviations
- **Semicolons:** Present in all statements
- **Trailing commas:** Used in multi-line structures

**Linting:**
- **Tool:** ESLint 10.4.0 with Next.js recommended configs
- **Config file:** `eslint.config.mjs` (flat config format)
- **Active rules:** Next.js Core Web Vitals + TypeScript type safety
- **Ignores:** `.next/`, `out/`, `build/`, `next-env.d.ts`
- **Run command:** `npm run lint`

**TypeScript:**
- **Target:** ES2017
- **JSX mode:** react-jsx
- **Strict mode:** Enabled (`strict: true`)
- **Module resolution:** bundler (Next.js 16 standard)
- **Path alias:** `@/*` maps to `/` (root of repo)

## Import Organization

**Order:**
1. External dependencies (`react`, `next`, `zod`, etc.)
2. Internal absolute imports using `@/` alias (utils, lib, components)
3. Type-only imports marked with `import type`
4. Unused imports removed by linter

**Example (from `src/lib/actions/transactions.ts`):**
```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { transactionImportSchema, transactionSchema } from "@/src/lib/schemas";
import { dateInputToUTC } from "@/src/lib/format";
import type { TransactionDTO } from "@/src/lib/types";
```

**Path Aliases:**
- `@/*` — Root of repository, used throughout to import from `src/lib/`, `src/components/`, etc.

## Error Handling

**Pattern:** Throw JavaScript `Error` with descriptive messages in Portuguese-BR

**Server Actions:**
- Call `requireUserId()` or `requireSession()` to enforce authentication, which throws "Não autorizado" if not authenticated
- Throw `Error()` for validation failures or business logic violations
- Example errors:
  - `"Categoria inválida"` (category ownership check failed)
  - `"Transação não encontrada"` (update/delete failed - no rows affected)
  - `"Não é possível excluir: existem lançamentos ou mensalidades usando essa categoria."` (cascade prevention)
  - `"Este email já está em uso"` (duplicate email)

**Client Components:**
- Catch errors from server actions or fetch calls
- Display via `toast.error()` (Sonner library)
- Extract message: `err instanceof Error ? err.message : "Erro ao salvar."`
- Example (from `categoryFormSheet.tsx`):
  ```typescript
  try {
    await updateCategory(category.id, data);
    toast.success("Categoria atualizada!");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
  }
  ```

**Validation:**
- Zod `.parse()` throws `ZodError` on invalid input — server actions catch and throw as Error for client
- Custom refinements add user-friendly messages
- Example (from `schemas.ts`):
  ```typescript
  .refine((p) => !isWeakPassword(p), {
    message: "Essa senha é muito comum. Escolha algo mais difícil de adivinhar.",
  })
  ```

## Logging

**Framework:** `console` (no dedicated logger configured)

**Patterns:**
- Minimal logging in codebase — errors bubble up as exceptions
- Comments explain complex logic (see next section)
- Server actions silently process; errors communicated back to client

## Comments

**When to Comment:**
- Inline comments in Portuguese-BR for non-obvious logic or design decisions
- SHORT comments, no docstrings (user preference per memory file)
- Explain the WHY, not the WHAT

**Examples from codebase:**
- `// Headers de segurança estáticos. O CSP NÃO está aqui — fica em src/proxy.ts porque depende de nonce gerado por request.` (next.config.ts)
- `// Top senhas triviais. Lista pequena de propósito — pega os piores casos sem virar maintenance burden.` (schemas.ts)
- `// bcrypt trunca em 72 bytes; capar previne ambiguidade.` (schemas.ts)
- `// Evita duplicar nome (constraint @@unique cobre, mas damos mensagem amigável)` (actions/categories.ts)
- `// Coleta os categoryIds únicos e valida todos de uma vez` (actions/transactions.ts)

**JSDoc/TSDoc:**
- Minimal use — rarely found in codebase
- When used, inline comment style preferred over multi-line blocks

## Function Design

**Size:** 
- Small, focused functions (10-30 lines typical for actions)
- Helpers extracted (e.g., `toDTO()`, `currentMonthRange()`)

**Parameters:**
- **Server Actions:** Accept `input: unknown`, validate with Zod schema immediately, then use typed data
- **Helper functions:** Typed parameters
- **Event handlers:** Use React event types or typed data objects

**Return Values:**
- **Async Server Actions:** Most return void or minimal data (void triggers `revalidatePath()`)
- **Query actions:** Return typed DTOs or arrays. Example: `async function listTransactions(): Promise<TransactionDTO[]>`
- **Mutation actions with output:** Return object with relevant data. Example: `importTransactions()` returns `{ imported: number }`

**Pattern (Server Action template):**
```typescript
export async function actionName(input: unknown) {
  const userId = await requireUserId(); // auth check
  const data = schemaName.parse(input);  // validation

  // business logic + DB queries
  
  revalidatePath("/affected/path");      // cache invalidation
}
```

## Module Design

**Exports:**
- **Server Actions:** Named exports only (no default exports)
- **Type definitions:** Named type exports for use in components
- **Constants:** Named exports for icon maps, color options, etc.

**Barrel Files:**
- Not used extensively
- Main entry points: `src/lib/actions/`, each domain has its own file

**Organization (by domain):**
- `src/lib/schemas.ts` — All Zod schemas + inferred input types
- `src/lib/types.ts` — DTOs and custom types (serializable for client)
- `src/lib/actions/{domain}.ts` — All mutations/queries for that domain (categories, transactions, etc.)
- `src/lib/constants.ts` — UI metadata (icon maps, color palettes, catalogs)
- `src/components/{domain}/` — Feature-specific components grouped by domain

## Form Handling

**Framework:** react-hook-form + Zod via `@hookform/resolvers`

**Pattern:**
```typescript
const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<InputType>({
  resolver: zodResolver(schema),
  defaultValues: { /* initial state */ },
});
```

**Submission:**
- Define `onSubmit(data: ValidatedType)` async function
- Wrap server action in try/catch
- Set loading state during submission
- Use `toast.success()` or `toast.error()` for feedback
- Call `reset()` if needed

## Date/Time Handling

**Pattern:**
- Dates accepted as strings from form input
- Convert to UTC using `dateInputToUTC()` helper before DB insert
- Store in DB as `Date` (Prisma handles)
- Return as ISO string (`.toISOString()`) in DTOs for client

**Example (from `categoryFormSheet.tsx`):**
```typescript
const data = transactionSchema.parse(input);
// ...
date: dateInputToUTC(data.date)  // string -> UTC Date
```

## Decimal/Money Handling

**Pattern:**
- Zod validates as `z.coerce.number().positive()`
- Prisma stores as `Decimal` type (avoids floating-point errors)
- Convert to number in DTO: `Number(t.amount.toString())`
- Client works with plain numbers

**Example (from `actions/transactions.ts`):**
```typescript
function toDTO(t: DbTransaction): TransactionDTO {
  return {
    amount: Number(t.amount.toString()),  // Decimal -> number
    // ...
  };
}
```

---

*Convention analysis: 2026-05-31*
