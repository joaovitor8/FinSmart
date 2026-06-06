<div align="center">

# 💸 FinSmart

**Controle financeiro pessoal com IA integrada**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

</div>

---

## Sobre o projeto

FinSmart é uma aplicação web fullstack de controle financeiro pessoal, desenvolvida como projeto de portfólio. Permite registrar entradas e saídas, gerenciar assinaturas fixas, definir metas de economia, acompanhar orçamentos por categoria e consultar um **mentor financeiro com IA** — alimentado pela API da Anthropic (Claude).

A aplicação conta com autenticação completa, gestão de sessões, verificação de email e proteção contra ataques comuns (timing attacks, rate limiting, CSP, CSV injection).

---

## Funcionalidades

- **Dashboard** — KPIs do mês (entradas, saídas, saldo, total de mensalidades), lançamentos recentes, gráfico de gastos por categoria, progresso de metas e orçamentos
- **Lançamentos** — Registro de receitas e despesas com filtros por tipo, categoria e período; importação de extrato via CSV com sugestão automática de categorias
- **Mensalidades** — Gerenciamento de assinaturas e contas fixas (Netflix, internet, academia etc.) com frequência mensal ou anual
- **Orçamento** — Limite mensal por categoria com barra de progresso e alertas visuais (verde/amarelo/vermelho)
- **Metas** — Objetivos financeiros com acompanhamento de progresso e adição incremental de valores
- **Relatórios** — Gráfico comparativo de entradas vs saídas, evolução do saldo, ranking de categorias e exportação para CSV
- **Mentor IA** — Chat com um consultor financeiro alimentado pelo Claude (Anthropic), com contexto real dos dados do usuário
- **Configurações** — Edição de perfil, troca de senha, gerenciamento de sessões ativas e exclusão de conta
- **PWA** — Manifest configurado para instalação como app em dispositivos móveis
- **Tema claro/escuro** — Alternância com persistência via `next-themes`

---

## Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions, RSC) |
| Linguagem | TypeScript 6 |
| Banco de dados | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| Autenticação | JWT (`jose`) + sessões no banco + cookies `httpOnly` |
| Estilização | Tailwind CSS 4 + shadcn/ui + Radix UI |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| IA | Anthropic SDK (`@anthropic-ai/sdk`) — modelo `claude-opus-4-7` |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) |
| Email | Resend |
| Ícones | Lucide React |

---

## Estrutura do projeto

```
app/
├── src/
│   ├── app/
│   │   ├── api/auth/          # Rotas de autenticação (login, register, logout, etc.)
│   │   ├── main/
│   │   │   └── (pages)/       # Dashboard, Lançamentos, Mensalidades, Orçamento,
│   │   │                      # Relatórios, Metas, Configurações, Mentor IA
│   │   ├── login/             # Página de login
│   │   ├── register/          # Página de cadastro
│   │   ├── forgot-password/   # Recuperação de senha
│   │   ├── reset-password/    # Redefinição de senha
│   │   ├── layout.tsx         # Layout raiz (providers, fontes, tema)
│   │   └── manifest.ts        # PWA manifest
│   ├── components/
│   │   ├── dashboard/         # KPIs, gráfico de categorias, metas no dashboard
│   │   ├── transactions/      # Lançamentos (add, edit, import CSV)
│   │   ├── monthlyFees/       # Mensalidades (add, edit, listagem)
│   │   ├── categories/        # Categorias e orçamento
│   │   ├── goals/             # Metas (add, edit, progresso)
│   │   ├── reports/           # Gráficos, filtro de período, exportação CSV
│   │   ├── settings/          # Perfil, senha, sessões, zona de perigo
│   │   ├── mentor/            # Chat com o Mentor IA
│   │   ├── app-sidebar.tsx    # Sidebar desktop
│   │   ├── mobile-nav.tsx     # Navegação mobile (bottom nav)
│   │   ├── mobile-header.tsx  # Header mobile
│   │   └── ui/                # Componentes base (shadcn/ui)
│   ├── contexts/
│   │   └── AuthContext.tsx    # Context + hook de autenticação
│   ├── lib/
│   │   ├── actions/           # Server Actions (CRUD de todas as entidades + mentor)
│   │   ├── prisma.ts          # Client Prisma com pool pg
│   │   ├── auth.ts            # Geração e verificação de JWT
│   │   ├── auth-server.ts     # Helpers de sessão para Server Components
│   │   ├── sessions.ts        # Criação, validação e revogação de sessões
│   │   ├── ratelimit.ts       # Rate limiting via Upstash (+ fallback em memória)
│   │   ├── email.ts           # Templates HTML e envio via Resend
│   │   ├── tokens.ts          # Geração e hash de tokens (email verification, reset)
│   │   ├── csvImport.ts       # Parser de extrato CSV + sugestão de categorias
│   │   ├── schemas.ts         # Schemas Zod (client + server)
│   │   ├── constants.ts       # Paleta de cores, catálogo de ícones
│   │   ├── format.ts          # Helpers de formatação (BRL, datas)
│   │   ├── seed.ts            # Categorias padrão para novos usuários
│   │   ├── anthropic.ts       # Client Anthropic (singleton)
│   │   └── types.ts           # DTOs serializáveis
│   └── prisma/
│       └── schema.prisma      # Schema do banco de dados
└── src/proxy.ts               # Middleware: autenticação + CSP com nonce
```

---

## Segurança

O projeto implementa diversas práticas de segurança:

- **Timing attack mitigation** — `bcrypt.compare` rodado em todo login (mesmo para usuários inexistentes), evitando enumeração de contas por tempo de resposta
- **Anti-enumeração** — cadastro e recuperação de senha sempre retornam sucesso, independentemente de o email existir
- **Rate limiting** — por IP nas rotas de auth (login, register, forgot-password, reset, verify-email) e por usuário no Mentor IA e importação de CSV, via Upstash Redis
- **Sessões revogáveis** — o JWT carrega `sessionId`; o middleware valida a assinatura (Edge) e o layout do `/main` valida contra o banco (Node), permitindo revogação imediata
- **Tokens de email hasheados** — apenas o hash SHA-256 toca o banco; o token em si vai somente no link do email
- **CSP com nonce** — Content Security Policy com nonce por request em produção
- **CSV injection prevention** — valores que começam com `=`, `+`, `-`, `@` são prefixados com `'` na exportação
- **Cookies `httpOnly` + `SameSite: lax` + `Secure` em produção**
- **Senhas comuns bloqueadas** — lista de senhas triviais verificada no cadastro e troca de senha
- **Cascade delete** — remoção de usuário limpa todos os dados associados via FK

---

## Banco de dados

O schema Prisma define as seguintes entidades:

| Model | Descrição |
|---|---|
| `User` | Usuário do sistema |
| `Session` | Sessão de login com userAgent e IP |
| `EmailVerificationToken` | Token de verificação de email (hash) |
| `PasswordResetToken` | Token de reset de senha (hash) |
| `Category` | Categorias do usuário (INCOME / EXPENSE / BOTH) |
| `Budget` | Orçamento mensal por categoria |
| `Transaction` | Lançamentos financeiros pontuais |
| `MonthlyFees` | Mensalidades e contas fixas |
| `Goal` | Metas de economia |

---

## Autor

Desenvolvido por **João Vitor Ezequiel**

[![GitHub](https://img.shields.io/badge/GitHub-joaovitor8-181717?style=flat&logo=github)](https://github.com/joaovitor8)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-joaovitorezequiel-0077B5?style=flat&logo=linkedin)](https://www.linkedin.com/in/joaovitorezequiel/)

---

## Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
