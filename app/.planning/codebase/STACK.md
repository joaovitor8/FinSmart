# Technology Stack

**Analysis Date:** 2026-05-31

## Languages

**Primary:**
- TypeScript 6.0.3 - Type-safe application code throughout

**Secondary:**
- JavaScript - Configuration files (eslint.config.mjs, postcss.config.mjs)

## Runtime

**Environment:**
- Node.js (versions specified via .nvmrc or engine field - not configured in package.json)

**Package Manager:**
- npm - Managing dependencies
- Lockfile: package-lock.json present (v3 format)

## Frameworks

**Core:**
- Next.js 16.2.6 - Full-stack web framework (App Router, Server Actions, API routes)
- React 19.2.6 - UI library with Server Components support
- React DOM 19.2.6 - DOM rendering

**Form & Validation:**
- react-hook-form 7.76.1 - Form state management and validation
- @hookform/resolvers 5.4.0 - Integration layer for Zod validation
- zod 4.4.3 - Schema validation and TypeScript inference

**UI Components:**
- Radix UI 1.4.3 - Accessible component primitives
- @radix-ui/* (avatar, checkbox, dialog, dropdown-menu, label, progress, radio-group, select, separator, slot, switch) - Specific component library
- shadcn 4.8.0 - Pre-built component collection builder
- Tailwind CSS 4.3.0 (via @tailwindcss/postcss 4.3.0) - Utility-first CSS framework
- class-variance-authority 0.7.1 - Type-safe variant composition
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.6.0 - Intelligent Tailwind class merging
- lucide-react 1.16.0 - Icon library

**Data Visualization:**
- recharts 3.8.1 - React charts library (used in Dashboard, Reports)

**Theme Management:**
- next-themes 0.4.6 - Dark/light mode support (configured with dark default)

**UI Notifications:**
- sonner 2.0.7 - Toast notification library

**Testing:**
- Not detected in dependencies (integration/unit tests likely use Node.js native or unpublished test runners)

**Build/Dev:**
- eslint 10.4.0 - Code quality and linting
- eslint-config-next 16.2.6 - Next.js ESLint configuration preset
- @types/* (node, react, react-dom, bcryptjs, pg) - TypeScript type definitions for common libraries

## Key Dependencies

**Critical:**
- @prisma/client 7.8.0 - ORM for database access
- @prisma/adapter-pg 7.8.0 - PostgreSQL adapter for Prisma
- pg 8.21.0 - Native PostgreSQL driver (required by adapter-pg)

**Authentication & Security:**
- jose 6.2.3 - JWT creation and verification (HS256 algorithm)
- bcryptjs 3.0.3 - Password hashing (bcrypt implementation in pure JS)

**Email Delivery:**
- resend 6.12.4 - Email service for transactional emails (verification, password reset)

**Rate Limiting & Cache:**
- @upstash/ratelimit 2.0.8 - Distributed rate limiting (sliding window algorithm)
- @upstash/redis 1.38.0 - Redis client for rate limiting and potentially caching

**AI/ML:**
- @anthropic-ai/sdk 0.98.0 - Anthropic Claude API integration (Mentor feature)

**Utilities:**
- date-fns 4.3.0 - Date manipulation and formatting

## Configuration

**Environment:**
- Configuration via .env file (not committed to git)
- Required variables documented in `ejemplo.env`
  - DATABASE_URL: PostgreSQL connection string
  - JWT_SECRET: HMAC-SHA256 secret for token signing
  - ANTHROPIC_API_KEY: Claude API key
  - UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN: Distributed cache/rate-limit
  - RESEND_API_KEY: Email service API key
  - EMAIL_FROM: Sender email address (default: onboarding@resend.dev for dev)
  - APP_URL: Public URL of the application (used in email links)

**Build:**
- `next.config.ts` - Security headers (HSTS, X-Frame-Options, CSP context)
- `tsconfig.json` - TypeScript strict mode enabled, path aliases (@/* → root)
- `prisma.config.ts` - Prisma configuration pointing to `src/prisma/schema.prisma`
- `components.json` - shadcn/ui configuration (Tailwind, Radix UI, Lucide icons)
- `postcss.config.mjs` - PostCSS processing pipeline
- `eslint.config.mjs` - ESLint rules (Next.js core web vitals, TypeScript)

## Platform Requirements

**Development:**
- Node.js (version unspecified, check .nvmrc or infer from package-lock)
- npm for dependency management
- PostgreSQL database (local or via connection string)

**Production:**
- Deployment: Vercel (inferred from Next.js 16 and CSP/HSTS patterns)
- PostgreSQL database (production instance)
- Upstash Redis (mandatory for distributed rate limiting in production)
- Resend account for email delivery
- Anthropic API key for Claude integration

---

*Stack analysis: 2026-05-31*
