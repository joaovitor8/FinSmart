# Requirements: FinSmart Security Hardening

**Defined:** 2026-05-31
**Core Value:** Garantir que um usuário nunca acesse nem corrompa dados de outro e que o app resista a abusos triviais (brute force, XSS, CSRF, requests sem proxy), sem trocar a stack nem reescrever o auth.

## v1 Requirements

Hardening completo (P1+P2 da research). Cada requirement mapeia para uma fase do roadmap.

### Foundation

- [ ] **FND-01**: `src/lib/env.ts` valida `JWT_SECRET`, `DATABASE_URL`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `APP_URL`, `CRON_SECRET` via zod no boot — falha no module load, não na primeira chamada
- [ ] **FND-02**: Schema `Budget` migra `@@unique([categoryId])` → `@@unique([userId, categoryId])` para fechar risco multi-tenant
- [ ] **FND-03**: Vitest scaffold com banco Postgres de teste real (`finsmart_test`), strategy de reset por suite e `$disconnect()` em `afterAll`
- [ ] **FND-04**: Teste de isolamento prova que upsert de Budget cross-user falha com erro de constraint
- [ ] **FND-05**: Teste de regressão de precisão decimal: soma de 1000 transações com `Decimal(12,2)` bate ao centavo

### Proxy & Headers

- [ ] **PXY-01**: `src/proxy.ts` expandido: aplica rate-limit por IP para `/api/auth/*` antes de o handler rodar (move da rota para a edge)
- [ ] **PXY-02**: `src/lib/ratelimit.ts#getClientIp()` só lê `x-forwarded-for` quando `process.env.VERCEL === "1"` ou `TRUSTED_PROXY === "true"`; emite warn no boot em produção sem sinal de proxy
- [ ] **PXY-03**: `next.config.ts` `headers()` adiciona HSTS, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` mínimo, `X-Content-Type-Options: nosniff`
- [ ] **PXY-04**: CSP em `src/proxy.ts` expande `connect-src` para `'self' https://api.anthropic.com https://*.upstash.io`; nonce propaga para `<ThemeProvider nonce>` em `src/app/layout.tsx`
- [ ] **PXY-05**: `verifyToken` em `src/lib/auth.ts` declara `algorithms: ["HS256"]` explicitamente para bloquear `alg=none`

### API Auth Hardening

- [ ] **API-01**: Todas as rotas em `src/app/api/auth/*` (login, register, forgot-password, reset-password) checam `Origin`/`Referer` contra `env.APP_URL` antes de mutar
- [ ] **API-02**: `src/lib/schemas.ts` substitui `COMMON_PASSWORDS` por `zxcvbn-ts` com dicionário pt-BR; rejeita score < 3 passando `email` + `name` como `userInputs`
- [ ] **API-03**: Schema de registro aplica `.max(72)` em `password` para evitar truncamento silencioso do bcrypt
- [ ] **API-04**: Login e register retornam mensagens genéricas idênticas para "email já existe / email não existe / senha errada" (anti-enumeração)
- [ ] **API-05**: Comparação de token em `src/lib/tokens.ts` usa `crypto.timingSafeEqual` (auditar; pode já estar OK)
- [ ] **API-06**: Rotas de auth rejeitam `?next=` com URL absoluta ou protocol-relative (`//evil.com`)
- [ ] **API-07**: `exportTransactionsCSV` prefixa qualquer célula que começa com `=`, `+`, `-`, `@`, `\t`, `\r` com `'` (anti CSV injection no Excel)

### DAL & authedAction

- [ ] **DAL-01**: `src/lib/dal/` criado com funções para Transactions, Categories, Budgets, Goals, MonthlyFees — todas recebem `userId` explícito e fazem check de ownership antes de retornar
- [ ] **DAL-02**: `src/lib/auth-server.ts#authedAction()` HOF wrapa todas as Server Actions: aplica zod, `requireUserId()`, propaga `userId` via `AsyncLocalStorage`, chama `revalidatePath` no fim
- [ ] **DAL-03**: Todas as Server Actions em `src/lib/actions/*` migradas para `authedAction()`; Prisma agora só é chamado via DAL
- [ ] **DAL-04**: Prisma `$extends({ query })` dev-only emite warn quando query em modelo "ownable" não tem `userId` em `where`
- [ ] **DAL-05**: Zod schemas de input usam `.strict()`; Prisma `data:` é montado com campos explícitos (sem `...input`)
- [ ] **DAL-06**: `addToGoalProgress` rejeita server-side `newCurrent > goal.target` com mensagem em pt-BR
- [ ] **DAL-07**: Suite de testes de isolamento cobre as 5 entidades — user A não lê / não edita / não apaga dados de user B

### Audit Log

- [ ] **AUD-01**: Schema novo `AuditLog { id, userId, model, recordId, op, before Json, after Json?, at }` com índice `(userId, at DESC)`
- [ ] **AUD-02**: `src/lib/prisma-audit.ts` usa `$extends({ query })` em Transaction/Goal/Budget/MonthlyFee para `update`/`delete`; lê `userId` do `AsyncLocalStorage`
- [ ] **AUD-03**: Mutação + audit row escritos no mesmo `prisma.$transaction([...])` — teste prova que falha de mutação NÃO deixa audit row
- [ ] **AUD-04**: Account delete (em `src/lib/actions/account.ts`) cascateia para `AuditLog` do usuário (decisão LGPD: purga em vez de redact)

### Token Cleanup

- [ ] **CRN-01**: `src/app/api/cron/cleanup-tokens/route.ts` apaga `EmailVerificationToken` e `PasswordResetToken` com `expiresAt < now()`; autenticado via header `CRON_SECRET`
- [ ] **CRN-02**: `vercel.json` define schedule `0 3 * * *` para o cron

### 2FA (TOTP)

- [ ] **TFA-01**: Schema acrescenta `User.twoFactorEnabled: Boolean`, `User.twoFactorSecretPending: String?`, `User.twoFactorSecret: String?` e modelo `RecoveryCode { id, userId, hash, usedAt? }`
- [ ] **TFA-02**: `src/lib/totp.ts` (otplib + qrcode) provê `generateSecret`, `buildKeyUri`, `verify`
- [ ] **TFA-03**: Server Action `enableTwoFactor` salva em `twoFactorSecretPending`, gera 10 códigos de recuperação bcrypt-hash; UI mostra QR + códigos uma única vez
- [ ] **TFA-04**: Server Action `confirmTwoFactor` valida primeiro código TOTP → promove pending → secret e seta `twoFactorEnabled = true`
- [ ] **TFA-05**: Login em `src/app/api/auth/login/route.ts` retorna `{ requires2fa: true, partialToken }` quando usuário tem 2FA; cliente envia código para `/api/auth/twofa-verify` que minta JWT completo
- [ ] **TFA-06**: Server Action `disableTwoFactor` exige re-autenticação (senha + TOTP/recovery) e limpa todos os campos
- [ ] **TFA-07**: Teste cobre fluxo completo: enroll → confirm → login com TOTP → uso de código de recuperação

### Compliance & P2 UX

- [ ] **CMP-01**: Settings ganha aba "Sessões ativas" listando `Session` ativas do usuário (UA, IP, last-active) com ações "revogar essa" e "revogar todas as outras"
- [ ] **CMP-02**: `/api/auth/login` envia email de notificação via Resend quando UA+IP combinação nunca foi vista para esse usuário (throttle 1/24h)
- [ ] **CMP-03**: Login conta tentativas falhadas por `userId`; após N (5) falhas em janela curta, bloqueia conta por 15min e envia email
- [ ] **CMP-04**: Ações destrutivas (`updateProfile` em email, `changePassword`, `disableTwoFactor`, `deleteAccount`) exigem re-auth válida nos últimos 5min (cookie `recent_auth_at` ou prompt)
- [ ] **CMP-05**: Server Action `checkBreachedPassword` usa HIBP k-anonymity (`api.pwnedpasswords.com/range/{prefix}`); roda em register e changePassword
- [ ] **CMP-06**: Server Action `exportUserData` retorna ZIP/JSON com tudo do usuário (User, Transaction, Category, Budget, Goal, MonthlyFee, Session, AuditLog); UI em Settings → "Baixar meus dados" (LGPD)
- [ ] **CMP-07**: `deleteAccount` confere que cascade apaga: User + todas entidades + Sessions + Tokens + AuditLog; envia email de confirmação; teste prova isolamento (user B não é afetado)

### Security Center

- [ ] **SEC-01**: Página `/main/settings/security` agrega: status 2FA (com link enable/disable), data do último password change, sessões ativas (link para aba), última notificação de login, link para export LGPD
- [ ] **SEC-02**: `SECURITY.md` na raiz com threat model, env vars obrigatórias, requisito de proxy confiável, `CRON_SECRET`, email de disclosure, limitações conhecidas (race de revoke, sem 2FA hardware key)

## v2 Requirements

Reconhecido mas adiado — não entra neste milestone.

### Recovery & Soft Delete

- **REC-01**: Soft delete para Transaction com janela de 30 dias para restaurar
- **REC-02**: Job de purge de soft-deleted após 30 dias

### Mentor Hardening

- **MEN-01**: Wrap user data em `<user_data>` no system prompt do Mentor; trunca descrição em 200 chars
- **MEN-02**: Prompt de consentimento LGPD para envio de dados financeiros à Anthropic (em onboarding + revogável em Settings)

### Operational

- **OPS-01**: Idempotência no CSV import via hash `(date, amount, description, categoryId)`
- **OPS-02**: CSP `report-uri` para coletar violações de CSP do browser
- **OPS-03**: Histórico de audit visível ao usuário (timeline por entidade)
- **OPS-04**: Encryption-at-rest aplicada a `User.twoFactorSecret` e `RecoveryCode.hash` via AES-GCM (chave em env)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migrar para Auth.js / Lucia / Clerk | Decisão de PROJECT.md: manter custom JWT; migração ≠ hardening |
| OAuth / login social (Google/GitHub/Apple) | Fora de escopo declarado; não é onde o usuário quer focar |
| WebAuthn / Passkeys (hardware key) | Alto esforço, nicho; revisitar depois de TOTP estável |
| SMS-based 2FA | SIM-swap é vetor #1 de ATO no Brasil; NIST SP 800-63B-3 deprecou |
| Email-only 2FA | Se email é comprometido, 2FA por email não protege |
| Perguntas de segurança | NIST advises against; engenharia social trivial |
| Rotação forçada de senha a cada 90 dias | NIST advises against; leva a `Senha2026!1` → `!2` |
| CAPTCHA em todo login | Hurt UX em PWA; reCAPTCHA leak para Google (LGPD) |
| 2FA obrigatório dia 1 | Dev solo se tranca fora; nenhum usuário real ainda |
| Audit log de READs | Amplificação de escrita massiva; LGPD não exige; inútil em app single-user |
| Presença real-time "logged in elsewhere" | Requer WebSocket; finance app não precisa |
| Pentest / SOC2 / ISO27001 | $15k–$50k; injustificado pré-launch |
| Encryption-at-rest de TODOS os campos | DB gerenciado já faz; app-layer quebra índices/sorts |
| Client-side E2E encryption | Quebra Mentor e relatórios; threat model não justifica |
| Bug bounty program | Sem usuários, sem superfície, sem capacidade de triagem |
| CSV import via `COPY` do Postgres | Otimização prematura para escala pessoal |
| Fix de perf (N+1, query unbounded em dashboard) | Próprio milestone de performance (não segurança) |
| Recurring transactions / multi-conta / cartões | Features novas — fora deste milestone de hardening |
| Internacionalização (não-BRL, não-pt-BR) | Não é o foco; documentar para milestone futuro |
| Time-zone awareness | Não é o foco deste milestone (documentar) |
| Playwright E2E suite | Custo/benefício ruim para dev solo sem usuários; Vitest cobre |

## Traceability

| Requirement | Fase | Status |
|-------------|------|--------|
| FND-01, FND-02, FND-03, FND-04, FND-05 | Phase 1: Foundation | Pending |
| PXY-01, PXY-02, PXY-03, PXY-04, PXY-05 | Phase 2: Proxy & Headers | Pending |
| API-01, API-02, API-03, API-04, API-05, API-06, API-07 | Phase 3: API Auth Hardening | Pending |
| DAL-01, DAL-02, DAL-03, DAL-04, DAL-05, DAL-06, DAL-07 | Phase 4: DAL + authedAction | Pending |
| AUD-01, AUD-02, AUD-03, AUD-04 | Phase 5: Audit Log | Pending |
| CRN-01, CRN-02 | Phase 6: Token Cleanup Cron | Pending |
| TFA-01, TFA-02, TFA-03, TFA-04, TFA-05, TFA-06, TFA-07 | Phase 7: 2FA (TOTP) | Pending |
| CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07 | Phase 8: Compliance & P2 UX | Pending |
| SEC-01, SEC-02 | Phase 9: Security Center + SECURITY.md | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 51
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-31*
*Last updated: 2026-05-31 after initialization*
