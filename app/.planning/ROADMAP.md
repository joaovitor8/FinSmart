# Roadmap: FinSmart Security Hardening

## Overview

Nove fases cobrem 51 requirements de endurecimento da base FinSmart sem reescrever o stack. A Fase 1 (Fundação) ancora tudo: validação de env, fix do schema `Budget`, scaffold de Vitest e primeiros testes de isolamento. Fases 2 (Proxy & Headers) e 3 (API Auth) podem rodar em paralelo depois da Fundação. Fase 4 (DAL + authedAction) é o refactor estrutural de maior alavancagem — centraliza a prevenção de IDOR em toda a CRUD. Fase 5 (Audit Log) depende do `userId` propagado pela Fase 4. Fase 6 (Token Cleanup Cron) é independente — pode entrar a qualquer momento depois da Fundação. Fase 7 (2FA TOTP) precisa da DAL e do audit sólidos antes de adicionar novo fluxo de auth. Fase 8 (Compliance & P2 UX) entrega sessões UI, lockout, notificações, LGPD export e delete verificado. Fase 9 (Security Center + SECURITY.md) agrega tudo numa página única e documenta o modelo de ameaça.

## Phases

- [ ] **Phase 1: Foundation** - Env validation, schema fix, Vitest scaffold, primeiros testes de isolamento e precisão decimal
- [ ] **Phase 2: Proxy & Headers** - Expandir `src/proxy.ts` (rate-limit edge, CSP completo, trusted-proxy) + headers estáticos em `next.config.ts`
- [ ] **Phase 3: API Auth Hardening** - CSRF, zxcvbn pt-BR, bcrypt cap, anti-enumeração, timing-safe tokens, open-redirect fix, CSV injection guard
- [ ] **Phase 4: DAL + authedAction** - Criar `src/lib/dal/`, HOF `authedAction()`, AsyncLocalStorage userId, ownership centralizada, isolation tests completos
- [ ] **Phase 5: Audit Log** - `AuditLog` model, Prisma `$extends` mutação+audit no mesmo `$transaction`, cascade LGPD em delete
- [ ] **Phase 6: Token Cleanup Cron** - Vercel Cron diário apaga `EmailVerificationToken`/`PasswordResetToken` expirados
- [ ] **Phase 7: 2FA (TOTP)** - Enrollment com QR + códigos de recuperação, login partial-token → twofa-verify, disable com re-auth
- [ ] **Phase 8: Compliance & P2 UX** - Sessões UI, login notifications, account lockout, re-auth para destrutivas, HIBP, LGPD export, delete cascade verificado
- [ ] **Phase 9: Security Center + SECURITY.md** - Página `/main/settings/security` agregadora + `SECURITY.md` (threat model, disclosure)

## Phase Details

### Phase 1: Foundation
**Goal**: Travar a base que todas as outras fases dependem — validação de env no boot, constraint multi-tenant corrigida no schema, Vitest rodando contra Postgres real, e os dois testes de regressão mais críticos (isolamento de Budget + precisão decimal) provam que a base funciona antes de mexer no resto.
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05
**Success Criteria** (what must be TRUE):
  1. App falha no boot (não em runtime) quando qualquer env var crítica está ausente ou inválida
  2. Schema `Budget` aplica `@@unique([userId, categoryId])` e migração rodou em dev
  3. `npm test` roda Vitest contra `finsmart_test` real, sem hangs no encerramento
  4. Teste prova que upsert de Budget cross-user falha com erro de constraint
  5. Teste prova que soma de 1000 transações `Decimal(12,2)` bate ao centavo exato
**Plans**: TBD

### Phase 2: Proxy & Headers
**Goal**: Endurecer a camada de borda — `src/proxy.ts` rejeita brute force por IP antes do handler, CSP libera Anthropic/Upstash, JWT exige algoritmo explícito, headers estáticos de segurança ativos em produção.
**Depends on**: Phase 1
**Requirements**: PXY-01, PXY-02, PXY-03, PXY-04, PXY-05
**Success Criteria** (what must be TRUE):
  1. 6ª chamada a `/api/auth/login` dentro de 60s retorna 429 vinda do proxy (não do handler)
  2. `getClientIp()` ignora `x-forwarded-for` quando não há sinal de proxy confiável; boot emite warn em prod sem proxy
  3. Resposta de produção inclui HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, X-Content-Type-Options
  4. CSP em prod permite Mentor (Anthropic) e Upstash em `connect-src`; `<ThemeProvider>` recebe nonce e dark mode funciona sem violação
  5. `verifyToken` rejeita JWT com `alg: "none"` (teste explícito)
**Notes**: Needs spike before plan-phase — CSP nonce + `next-themes` + `recharts` em App Router exige PoC antes de detalhar tasks.

### Phase 3: API Auth Hardening
**Goal**: Fechar todas as fronteiras de `src/app/api/auth/*` — CSRF por Origin, política de senha real (zxcvbn pt-BR), proteção contra truncamento bcrypt, anti-enumeração de email, comparação timing-safe e limpeza de vetores menores (open redirect, CSV injection).
**Depends on**: Phase 1
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06, API-07
**Success Criteria** (what must be TRUE):
  1. POST em `/api/auth/*` com `Origin` ou `Referer` diferente de `env.APP_URL` retorna 403
  2. Senhas fracas ("Senha123", nome do usuário, dicionário comum pt-BR) são rejeitadas no register e na troca de senha
  3. Senha com 73+ bytes é rejeitada pelo schema (não silenciosamente truncada)
  4. Login e register retornam mensagem genérica idêntica para email-existe / email-não-existe / senha-errada
  5. CSV exportado abre no Excel sem auto-executar `=`/`+`/`-`/`@` como fórmula
**Notes**: Pode rodar em paralelo com Phase 2 (matérias independentes).

### Phase 4: DAL + authedAction
**Goal**: Refator estrutural mais importante do milestone — toda Server Action passa por `authedAction()`, todo Prisma vai para `src/lib/dal/*`, `userId` propaga via AsyncLocalStorage, e a suíte de testes prova que user A não vê / não edita / não apaga dados de user B em nenhuma das 5 entidades.
**Depends on**: Phase 1
**Requirements**: DAL-01, DAL-02, DAL-03, DAL-04, DAL-05, DAL-06, DAL-07
**Success Criteria** (what must be TRUE):
  1. Todas as Server Actions em `src/lib/actions/*` usam `authedAction()` e delegam Prisma para `src/lib/dal/*`
  2. Em dev, query Prisma em modelo ownable sem `userId` no `where` emite warn no console
  3. `addToGoalProgress` rejeita server-side amount que ultrapassa o target
  4. Suite de testes prova isolamento entre dois usuários em Transactions, Categories, Budgets, Goals e MonthlyFees
  5. Nenhum `data: { ...input }` ou `Number(prismaDecimal)` permanece nos paths de mutação financeira
**Plans**: TBD

### Phase 5: Audit Log
**Goal**: Toda mutação financeira (update/delete em Transaction, Goal, Budget, MonthlyFee) registra audit row no mesmo `$transaction` que a mutação — falha de mutação não deixa rastro, sucesso sempre deixa. Account delete cascateia para `AuditLog` (decisão LGPD).
**Depends on**: Phase 4
**Requirements**: AUD-01, AUD-02, AUD-03, AUD-04
**Success Criteria** (what must be TRUE):
  1. Update em Transaction grava `AuditLog` com `before` e `after`, `userId`, `op="update"`
  2. Mutação que falha (e dá rollback) NÃO deixa audit row — teste explícito
  3. Account delete remove `AuditLog` do usuário (cascade); teste prova que audit log de outro user permanece intacto
  4. Índice `(userId, at DESC)` em `AuditLog` torna "minhas últimas N alterações" eficiente
**Notes**: Needs spike before plan-phase — confirmar sintaxe exata de Prisma 7 `$extends({ query })` dentro de `$transaction([...])` com PoC.

### Phase 6: Token Cleanup Cron
**Goal**: Limpar `EmailVerificationToken` e `PasswordResetToken` expirados diariamente via Vercel Cron, autenticado com `CRON_SECRET`. Independente de tudo depois da Fundação.
**Depends on**: Phase 1
**Requirements**: CRN-01, CRN-02
**Success Criteria** (what must be TRUE):
  1. `vercel.json` define cron `0 3 * * *` apontando para `/api/cron/cleanup-tokens`
  2. Endpoint rejeita request sem header `CRON_SECRET` válido
  3. Após execução, todos os tokens com `expiresAt < now()` estão deletados
**Plans**: TBD

### Phase 7: 2FA (TOTP)
**Goal**: Usuário pode habilitar 2FA por app autenticador (TOTP), gerar 10 códigos de recuperação bcrypt-hash, e o login passa a exigir TOTP quando ativado. Disable exige re-auth (senha + TOTP/recovery). Secret só vira ativo depois do primeiro código válido.
**Depends on**: Phases 4, 5
**Requirements**: TFA-01, TFA-02, TFA-03, TFA-04, TFA-05, TFA-06, TFA-07
**Success Criteria** (what must be TRUE):
  1. Usuário pode habilitar 2FA via QR code; secret só vira `twoFactorSecret` (ativo) depois de validar o primeiro código
  2. 10 códigos de recuperação são exibidos uma única vez no enrollment e podem substituir TOTP no login
  3. Login de usuário com 2FA ativo retorna `partialToken`; cliente envia TOTP/recovery a `/api/auth/twofa-verify` para receber sessão completa
  4. Disable 2FA exige senha + TOTP/recovery válido nos últimos 5min
  5. Teste cobre enroll → confirm → login com TOTP → consumo de código de recuperação
**UI hint**: yes
**Notes**: Needs spike before plan-phase — confirmar `otplib` + Node 22 + Next.js 16 antes de detalhar tasks.

### Phase 8: Compliance & P2 UX
**Goal**: Surface tudo que está no backend e cobrir obrigações LGPD — UI de sessões ativas com revoke, notificações de login novas, lockout por usuário, re-auth de ações destrutivas, HIBP, export de dados e verificação do delete-cascade.
**Depends on**: Phases 4, 5, 7
**Requirements**: CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07
**Success Criteria** (what must be TRUE):
  1. Settings → "Sessões ativas" lista todas as sessões com UA/IP/last-active e permite "revogar essa" e "revogar todas as outras"
  2. Login de UA+IP novo dispara email de notificação via Resend (throttle 1/24h por combinação)
  3. 5 falhas de login em janela curta bloqueiam a conta por 15min e enviam email
  4. Ações destrutivas (mudar email, trocar senha, disable 2FA, deletar conta) exigem re-auth válida nos últimos 5min
  5. "Baixar meus dados" gera bundle com tudo do usuário; "Deletar minha conta" cascateia para User+Transaction+Category+Budget+Goal+MonthlyFee+Session+Token+AuditLog e envia email de confirmação
**UI hint**: yes
**Plans**: TBD

### Phase 9: Security Center + SECURITY.md
**Goal**: Página única `/main/settings/security` agrega tudo (status 2FA, sessões ativas, últimas notificações, export, último password change) e `SECURITY.md` documenta o threat model, env vars obrigatórias, requisito de proxy confiável, email de disclosure e limitações conhecidas.
**Depends on**: Phase 8
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. `/main/settings/security` agrega: status 2FA com toggle, sessões ativas (link), última notificação de login, link "Baixar meus dados", data do último password change
  2. `SECURITY.md` na raiz lista env vars obrigatórias, requisito de proxy confiável, `CRON_SECRET`, email de disclosure, e limitações conhecidas (race de revoke, ausência de hardware key)
**UI hint**: yes
**Plans**: TBD

## Progress

**Execution Order:**
Phase 1 → (2 || 3 || 6) → 4 → 5 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Proxy & Headers | 0/TBD | Not started | - |
| 3. API Auth Hardening | 0/TBD | Not started | - |
| 4. DAL + authedAction | 0/TBD | Not started | - |
| 5. Audit Log | 0/TBD | Not started | - |
| 6. Token Cleanup Cron | 0/TBD | Not started | - |
| 7. 2FA (TOTP) | 0/TBD | Not started | - |
| 8. Compliance & P2 UX | 0/TBD | Not started | - |
| 9. Security Center + SECURITY.md | 0/TBD | Not started | - |
