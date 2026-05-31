# Testing Patterns

**Analysis Date:** 2026-05-31

## Test Framework Status

**Current State:** No testing framework configured or tests present in codebase.

**Finding:** 
- `package.json` lists dependencies for development (`@types/node`, `@types/react`, `typescript`, etc.) but NO test runners (Jest, Vitest, etc.) are installed
- No `.test.ts`, `.spec.ts`, or test configuration files (`jest.config.js`, `vitest.config.ts`) exist in `src/` directory
- No test scripts in `package.json` (only `dev`, `build`, `start`, `lint`)
- All 100 source files are production code only

**Implication:** This codebase has ZERO unit/integration/E2E test coverage. All functionality relies on manual testing and linting (ESLint).

---

## Recommendations for Future Testing

### Framework Choice

**Suggested Option:** Vitest
- **Why:** Native ESM support, fast, minimal config for Next.js projects, compatible with existing TypeScript setup
- **Alternative:** Jest (more established, larger community, but heavier setup)

**Installation (example):**
```bash
npm install -D vitest @vitest/ui happy-dom
```

**Configuration location:** Would go at project root as `vitest.config.ts`

---

## Test Structure (If Implemented)

**Proposed File Locations:**
- Unit tests for utilities: `src/lib/*.test.ts` (co-located)
  - Example: `src/lib/schemas.test.ts` — validate Zod schema edge cases
  - Example: `src/lib/format.test.ts` — test date/time conversions
- Server action tests: `src/lib/actions/*.test.ts` (co-located)
  - Example: `src/lib/actions/transactions.test.ts` — mock Prisma, test CRUD + permissions
- Component tests: `src/components/**/*.test.tsx` (co-located)
  - Example: `src/components/categories/categoryFormSheet.test.tsx` — test form validation feedback

**Naming Convention:**
- Test file = source file name + `.test.ts` or `.test.tsx`
- Test suite names: Describe the function or component
- Test case names: Describe the scenario (given/when/then style)

---

## Proposed Test Structure

**Test Suite Organization (Example Pattern):**

```typescript
// src/lib/schemas.test.ts
import { describe, it, expect } from "vitest";
import { registerSchema, transactionSchema } from "./schemas";
import type { ZodError } from "zod";

describe("registerSchema", () => {
  it("should accept valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "João Silva",
      email: "joao@example.com",
      password: "SecurePass123!",
    });
    expect(result.success).toBe(true);
  });

  it("should reject weak password", () => {
    const result = registerSchema.safeParse({
      name: "João Silva",
      email: "joao@example.com",
      password: "password123",  // Common password
    });
    expect(result.success).toBe(false);
  });

  it("should reject password containing email local part", () => {
    const result = registerSchema.safeParse({
      name: "João Silva",
      email: "joao@example.com",
      password: "joao12345!",  // Contains 'joao'
    });
    expect(result.success).toBe(false);
  });
});
```

---

## Mocking Strategy (If Tests Are Added)

**Framework:** Vitest built-in mocking + `vi.mock()`

**What to Mock:**
- **Prisma client** — Use `vi.mock()` to stub database calls
- **External APIs** — Anthropic SDK for mentor endpoint
- **Next.js functions** — `revalidatePath()`, `cookies()`, etc.
- **Authentication** — Mock `requireUserId()` to return test user ID

**What NOT to Mock:**
- **Zod schemas** — Always test real schema validation (catches runtime bugs)
- **Business logic in helpers** — Test `currentMonthRange()`, `toDTO()` with real values
- **Form validation rules** — Test the actual schema rules

**Example Mock Pattern (Server Action):**
```typescript
import { vi } from "vitest";
import { createTransaction } from "./transactions";
import { prisma } from "@/src/lib/prisma";

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    category: {
      findFirst: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/src/lib/auth-server", () => ({
  requireUserId: vi.fn(() => Promise.resolve("test-user-123")),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("createTransaction", () => {
  it("should create a transaction with valid input", async () => {
    // Setup mocks...
    vi.mocked(prisma.category.findFirst).mockResolvedValueOnce({
      id: "cat-1",
      userId: "test-user-123",
      // ...
    });

    await createTransaction({
      type: "EXPENSE",
      amount: 50,
      description: "Lunch",
      categoryId: "cat-1",
      date: "2026-05-31",
    });

    expect(prisma.transaction.create).toHaveBeenCalled();
  });
});
```

---

## Fixtures and Factories (If Tests Are Added)

**Test Data Location:** Could go in `src/lib/test-fixtures.ts` or `tests/fixtures/`

**Factory Pattern Example:**
```typescript
// Helper to create test transactions
export function createMockTransaction(overrides?: Partial<TransactionDTO>): TransactionDTO {
  return {
    id: crypto.randomUUID(),
    type: "EXPENSE",
    amount: 100,
    description: "Test transaction",
    date: new Date().toISOString(),
    category: createMockCategory(),
    ...overrides,
  };
}

export function createMockCategory(overrides?: Partial<CategoryDTO>): CategoryDTO {
  return {
    id: crypto.randomUUID(),
    name: "Test Category",
    icon: "utensils",
    color: "emerald",
    type: "EXPENSE",
    ...overrides,
  };
}
```

---

## Coverage Targets (Suggested)

Since no testing exists currently, here's a prioritization for implementation:

**Priority 1 - Critical (Test First):**
- `src/lib/schemas.ts` — All Zod schema validation rules (weak passwords, email ownership, field lengths)
- `src/lib/auth-server.ts` — Auth guard functions (`requireUserId()`, `requireSession()`)
- `src/lib/actions/account.ts` — Password hashing, email uniqueness, account deletion
- `src/lib/actions/categories.ts` — Ownership checks, cascade prevention (cannot delete if used)
- `src/lib/actions/transactions.ts` — Bulk import logic, ownership validation

**Priority 2 - Important (High Value):**
- Form components with complex validation feedback
- Dashboard aggregation logic (spending calculations)
- Date/time conversions (`dateInputToUTC()`)
- Decimal amount conversions

**Priority 3 - Nice to Have:**
- Simple UI components (buttons, inputs)
- Page layout tests
- E2E tests for critical user flows (register → create transaction → view dashboard)

**Target Coverage (if implemented):** 
- Critical business logic: 100%
- Schema/validation: 100%
- Utilities: 80%+
- Components: 60%+

---

## Test Commands (Proposed)

Once testing is added, recommended commands in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Current Testing Gaps

| Area | Status | Risk |
|------|--------|------|
| Schema validation | No tests | High — weak password rules, field limits not verified |
| Server actions | No tests | High — DB queries, ownership checks, cascade logic untested |
| Authentication | No tests | Critical — auth middleware and session validation untested |
| Form components | Manual only | Medium — validation feedback relies on Zod + manual testing |
| Business logic (aggregations) | Manual only | Medium — dashboard calculations not verified |
| API routes | No tests | Medium — auth endpoints (login, register) not automated |
| Bulk import logic | No tests | Medium — CSV import edge cases not verified |

---

## Next Steps

**To add testing framework:**
1. Install test runner (Vitest recommended)
2. Create `vitest.config.ts` at project root
3. Add test script to `package.json`
4. Start with schema validation tests (easiest, highest ROI)
5. Move to server action tests with mocked Prisma
6. Add component tests for complex forms
7. Set up coverage reporting and CI integration

---

*Testing analysis: 2026-05-31*
