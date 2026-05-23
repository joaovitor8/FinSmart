"use server";

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { getAnthropic, MENTOR_MODEL } from "@/src/lib/anthropic";
import { rateLimit } from "@/src/lib/ratelimit";
import { askMentorSchema } from "@/src/lib/schemas";

export type MentorMessage = {
  role: "user" | "assistant";
  content: string;
};

// Início/fim do mês corrente em UTC.
function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Gera um resumo financeiro estruturado em texto para o LLM
async function buildFinancialContext(userId: string): Promise<string> {
  const { start, end } = currentMonthRange();

  const [user, transactions, fees, goals, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: { select: { name: true, type: true } } },
    }),
    prisma.monthlyFees.findMany({
      where: { userId },
      include: { category: { select: { name: true } } },
    }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.category.findMany({
      where: { userId },
      include: { budget: true },
    }),
  ]);

  let income = 0;
  let expense = 0;
  const expenseByCat = new Map<string, number>();
  for (const t of transactions) {
    const amount = Number(t.amount.toString());
    if (t.type === "INCOME") income += amount;
    else {
      expense += amount;
      expenseByCat.set(t.category.name, (expenseByCat.get(t.category.name) ?? 0) + amount);
    }
  }
  const balance = income - expense;

  let monthlyFeesTotal = 0;
  for (const f of fees) {
    const amount = Number(f.amount.toString());
    monthlyFeesTotal += f.frequency === "Anual" ? amount / 12 : amount;
  }

  const topExpenses = Array.from(expenseByCat.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, total]) => `- ${name}: ${brl(total)}`)
    .join("\n");

  const budgetsLines = categories
    .filter((c) => c.budget && c.type !== "INCOME")
    .map((c) => {
      const budget = Number(c.budget!.amount.toString());
      const spent = expenseByCat.get(c.name) ?? 0;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      return `- ${c.name}: ${brl(spent)} de ${brl(budget)} (${pct}%)`;
    })
    .join("\n");

  const goalsLines = goals
    .map((g) => {
      const t = Number(g.target.toString());
      const c = Number(g.current.toString());
      const pct = t > 0 ? Math.round((c / t) * 100) : 0;
      return `- ${g.name}: ${brl(c)} de ${brl(t)} (${pct}%)`;
    })
    .join("\n");

  const monthLabel = new Date()
    .toLocaleString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  return [
    `# Resumo financeiro de ${user?.name ?? "usuário"} — ${monthLabel}`,
    "",
    `## KPIs do mês`,
    `- Entradas: ${brl(income)}`,
    `- Saídas: ${brl(expense)}`,
    `- Saldo: ${brl(balance)}`,
    `- Mensalidades fixas (rateadas/mês): ${brl(monthlyFeesTotal)}`,
    "",
    `## Top categorias de saída no mês`,
    topExpenses || "- (sem saídas registradas)",
    "",
    `## Orçamentos definidos`,
    budgetsLines || "- (sem orçamentos configurados)",
    "",
    `## Metas`,
    goalsLines || "- (sem metas cadastradas)",
  ].join("\n");
}

const SYSTEM_PROMPT = `Você é o "Mentor FinSmart", um conselheiro financeiro pessoal em português do Brasil.

Seu papel:
- Analisar a situação financeira do usuário (resumo enviado no contexto) e responder dúvidas com clareza e empatia.
- Dar conselhos práticos, com números, baseados nos dados reais — não invente valores.
- Quando indicar oportunidades, seja específico: aponte a categoria, o valor e o impacto.
- Se o usuário pedir algo fora de finanças pessoais, recuse educadamente e redirecione.

Estilo:
- Direto, em PT-BR, tom amigável e profissional.
- Use formatação Markdown leve (negrito, listas curtas) quando ajudar a leitura.
- Não use emojis em excesso. No máximo 1 ou 2 quando fizer sentido.
- Respostas curtas para perguntas simples; aprofunde só quando for útil.
- Evite jargão. Se usar termo técnico, explique em uma frase.

Limites:
- Você não tem acesso a dados além do contexto fornecido — se faltar informação, peça ao usuário.
- Não dê recomendações de produtos financeiros específicos (corretoras, bancos, fundos com nome).
- Não invente valores nem garanta retornos.`;

// Action principal: recebe histórico + nova mensagem, retorna resposta do mentor.
export async function askMentor(
  history: MentorMessage[],
  userMessage: string,
): Promise<{ reply: string }> {
  const userId = await requireUserId();

  // Anti abuso de custo: limita chamadas à API paga da Anthropic por usuário.
  const limit = rateLimit(`mentor:${userId}`, 10, 60_000);
  if (!limit.success) {
    return {
      reply: `Você enviou muitas perguntas em pouco tempo. Aguarde ${limit.retryAfterSeconds}s e tente novamente.`,
    };
  }

  // Valida tamanho da pergunta e do histórico — evita prompt-bomb na API
  const parsed = askMentorSchema.parse({ history, userMessage });

  const client = getAnthropic();

  const finance = await buildFinancialContext(userId);

  // Monta as mensagens: histórico do chat + a nova pergunta
  const messages: Anthropic.MessageParam[] = [
    ...parsed.history.map<Anthropic.MessageParam>((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: parsed.userMessage },
  ];

  const response = await client.messages.create({
    model: MENTOR_MODEL,
    max_tokens: 1024,
    system: [
      { type: "text", text: SYSTEM_PROMPT },
      // Contexto financeiro vai como um segundo bloco para deixar claro que é dado dinâmico
      { type: "text", text: `\nContexto atual do usuário:\n\n${finance}` },
    ],
    messages,
  });

  // Extrai texto da resposta
  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { reply: reply || "Não consegui gerar uma resposta agora. Tente reformular sua pergunta." };
}
