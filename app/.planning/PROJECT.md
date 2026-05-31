# FinSmart — Hardening de Segurança

## What This Is

FinSmart é um app pessoal de controle financeiro em Next.js 16 + Prisma 7 + PostgreSQL, com auth caseiro (JWT + bcrypt), Server Actions para mutações e um "Mentor IA" via Anthropic. O produto-base já está completo (registro/login, transações, categorias, orçamentos, metas, mensalidades, relatórios, mentor, settings, PWA, import CSV). Este milestone existe porque o autor construiu o app sem se aprofundar em segurança e quer auditar e endurecer todas as rotas e regras antes de qualquer evolução futura.

## Core Value

Garantir que **um usuário nunca acesse nem corrompa dados de outro** e que **o app resista a abusos triviais** (brute force, XSS, CSRF, requests sem proxy) — sem trocar a stack nem reescrever o auth.

## Requirements

### Validated

<!-- Tudo já entregue antes deste milestone (Ondas 0 → 6C). Locked. -->

- ✓ Auth por email/senha com JWT em cookie httpOnly + bcrypt 12 — existente
- ✓ Verificação de email via token hash + Resend — existente
- ✓ Reset de senha via token hash + Resend — existente
- ✓ Sessões persistidas com revogação no Prisma — existente
- ✓ Rate limit em rotas de auth (Upstash + fallback em memória) — existente
- ✓ CRUD de Transactions, Categories, Budgets, Goals, MonthlyFees via Server Actions — existente
- ✓ Dashboard com KPIs + gráfico — existente
- ✓ Relatórios com export CSV pt-BR — existente
- ✓ Mentor IA (Claude) com contexto financeiro do usuário — existente
- ✓ Settings (perfil, troca de senha, exclusão de conta) — existente
- ✓ Theme toggle, PWA, import CSV de extrato com auto-categorização — existente

### Active

<!-- Hipóteses de endurecimento. Cada uma vira fase no roadmap. -->

- [ ] **Isolamento multi-tenant verificado** — `@@unique([userId, categoryId])` no Budget, testes provando que A não vê/edita dados de B em todas as actions
- [ ] **Middleware de auth na edge** — `src/middleware.ts` rejeita requests sem cookie válido antes de chegar nas pages/actions
- [ ] **CSRF nas API Routes de auth** — login/register/forgot/reset deixam de depender só de `SameSite=Strict`
- [ ] **CSP + headers de segurança em produção** — definidos via `next.config.ts` ou middleware (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- [ ] **Rate limit confiável** — guarda contra spoof de `x-forwarded-for` quando o app não está atrás de proxy
- [ ] **Política de senha mais forte** — `zxcvbn` (entropia) substituindo lista hardcoded de senhas comuns
- [ ] **2FA opcional (TOTP)** — usuário pode habilitar 2FA via app autenticador
- [ ] **Audit log de mudanças financeiras** — registra edições/exclusões de Transaction/Goal/Budget com snapshot do valor antigo
- [ ] **Precisão decimal validada** — testes provando que somatórios de Decimal(12,2) em KPIs/relatórios não acumulam erro
- [ ] **Goal progress com limite** — `addToGoalProgress` rejeita valores que ultrapassem o target
- [ ] **Validação de env vars críticas no boot** — falha cedo se `JWT_SECRET`, `DATABASE_URL` ou `ANTHROPIC_API_KEY` estiverem ausentes
- [ ] **Limpeza de tokens expirados** — job recorrente apaga `EmailVerificationToken`/`PasswordResetToken` vencidos
- [ ] **Suite de testes de segurança** — Vitest cobrindo isolamento multi-user, rate limit, revogação de sessão, precisão decimal

### Out of Scope

- **Migrar auth para Auth.js / Lucia / Clerk** — usuário decidiu manter o auth caseiro; troca de provider é outro milestone se virar necessário
- **Features novas (Ondas 7+: investimentos, contas múltiplas, cartões, recorrências automáticas, multi-usuário/família)** — este milestone é só hardening; features novas viram milestone depois
- **Pentest profissional / certificação** — escopo é elevar o piso, não obter selo
- **Compliance regulatório (LGPD formal, PCI)** — app local, sem dados de cartão; documentar boas práticas mas sem auditoria externa
- **OAuth / login social** — não estava no plano e não é onde o usuário quer focar

## Context

- **Estado atual:** todo o produto-base (Ondas 0 → 6C) está entregue e funcional em dev. App ainda não foi publicado e não tem usuários reais — o autor pode quebrar APIs livremente sem migração de dados.
- **Por que agora:** o autor reconhece que aprendeu pouco sobre segurança ao construir e quer fechar essa lacuna antes de evoluir o produto. Preocupações declaradas, em ordem de medo: vazamento entre contas, roubo de conta, vulnerabilidades web clássicas, integridade financeira.
- **Codebase map:** `.planning/codebase/` tem 7 documentos (`STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`). `CONCERNS.md` em particular foi onde os riscos atuais foram catalogados — é a fonte primária para derivar as fases deste milestone.
- **Testes:** o projeto não tem nenhum teste automatizado hoje (`TESTING.md` deixa isso explícito). Este milestone introduz Vitest e os primeiros testes — focados em segurança, não cobertura geral.
- **Idioma:** comentários inline em PT-BR, curtos. Mensagens de erro voltadas ao usuário em PT-BR.
- **Memória do autor:** Stack Server Actions (sem axios), react-hook-form + zod, next-themes (dark default), bcryptjs cost 12, jose para JWT.

## Constraints

- **Tech stack**: Next.js 16 (App Router) + React 19 + Prisma 7 + PostgreSQL + Tailwind v4 + shadcn/ui. Auth com `jose` e `bcryptjs`. Sem trocar nada disso.
- **Padrões obrigatórios**: Server Actions em `src/lib/actions/*`, schemas em `src/lib/schemas.ts`, helpers server-only em `src/lib/auth-server.ts`, forms com RHF + zod.
- **Idioma**: comentários e mensagens em PT-BR, curtos.
- **Sem usuários ainda**: breaking changes são livres — migrações destrutivas no Prisma são aceitáveis (`db push --force-reset`).
- **Solo developer**: o autor é o único executor; agentes do GSD operam no mesmo repo. Fluxo de PRs continua existindo (último commit foi merge da branch `usando-claude`).
- **Custo de IA**: o app já paga Anthropic pelo Mentor. Modelos do GSD devem ser eficientes, não os mais caros, salvo onde profundidade compensar.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Milestone focado só em hardening (sem features novas) | Autor quer endurecer antes de evoluir; mistura de hardening + feature dilui foco | — Pending |
| Manter auth caseiro (JWT + jose + bcryptjs) | Já existe e funciona; migrar para Auth.js/Lucia é trabalho separado se virar necessário | — Pending |
| Introduzir Vitest agora (zero testes hoje) | Hardening sem teste regride; precisa de prova automatizada para isolamento, rate limit, sessões | — Pending |
| `zxcvbn` para política de senha (vs ampliar lista hardcoded) | Entropia cobre muito mais casos que wordlist; lista BR seria reinventar a roda | — Pending |
| Dev local sem usuários — breaking changes liberados | Permite migrar schema (`@@unique([userId, categoryId])`) sem cerimônia de migração | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-31 after initialization*
