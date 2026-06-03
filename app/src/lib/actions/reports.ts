"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";

// Ponto mensal usado nos gráficos do relatório
export type MonthlyPoint = {
  monthKey: string; // "2026-05"
  monthLabel: string; // "Mai/26"
  income: number;
  expense: number;
  balance: number;
};

// Totais por categoria (saídas ou entradas) no período inteiro
export type CategoryTotalDTO = {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
};

export type ReportsData = {
  period: { months: number; startIso: string; endIso: string };
  series: MonthlyPoint[];
  topExpenseCategories: CategoryTotalDTO[];
  topIncomeCategories: CategoryTotalDTO[];
  insights: {
    totalIncome: number;
    totalExpense: number;
    avgMonthlyIncome: number;
    avgMonthlyExpense: number;
    bestSavingMonth: MonthlyPoint | null; // maior saldo
    worstSavingMonth: MonthlyPoint | null; // menor saldo (pode ser negativo)
    biggestExpenseCategory: CategoryTotalDTO | null;
  };
};

// Início do mês N meses atrás (incluindo o mês corrente). UTC.
function rangeForMonths(months: number) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return { start, end };
}

// "2026-05" e "Mai/26" a partir de ano/mês (0-indexed)
const MONTH_LABELS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function monthKeyAndLabel(year: number, monthIdx: number) {
  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
  const monthLabel = `${MONTH_LABELS_PT[monthIdx]}/${String(year).slice(-2)}`;
  return { monthKey, monthLabel };
}

// Carrega tudo que a página de relatórios precisa em uma única query agrupada.
export async function getReportsData(months: number = 6): Promise<ReportsData> {
  const userId = await requireUserId();
  const safeMonths = Math.min(Math.max(months, 1), 24);
  const { start, end } = rangeForMonths(safeMonths);

  const [transactions, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "asc" },
      select: { amount: true, type: true, date: true, categoryId: true },
    }),
    prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true, icon: true, color: true },
    }),
  ]);

  // Esqueleto da série: garante que meses sem lançamentos apareçam zerados
  const series: MonthlyPoint[] = [];
  const seriesByKey = new Map<string, MonthlyPoint>();
  for (let i = 0; i < safeMonths; i++) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const { monthKey, monthLabel } = monthKeyAndLabel(d.getUTCFullYear(), d.getUTCMonth());
    const point: MonthlyPoint = { monthKey, monthLabel, income: 0, expense: 0, balance: 0 };
    series.push(point);
    seriesByKey.set(monthKey, point);
  }

  // Acumuladores por categoria
  const expenseByCat = new Map<string, number>();
  const incomeByCat = new Map<string, number>();

  for (const t of transactions) {
    const amount = Number(t.amount.toString());
    const d = t.date;
    const { monthKey } = monthKeyAndLabel(d.getUTCFullYear(), d.getUTCMonth());
    const point = seriesByKey.get(monthKey);
    if (!point) continue;

    if (t.type === "INCOME") {
      point.income += amount;
      incomeByCat.set(t.categoryId, (incomeByCat.get(t.categoryId) ?? 0) + amount);
    } else {
      point.expense += amount;
      expenseByCat.set(t.categoryId, (expenseByCat.get(t.categoryId) ?? 0) + amount);
    }
  }

  for (const p of series) p.balance = p.income - p.expense;

  // Mapeia categoria id -> dados visuais
  const catMap = new Map(categories.map((c) => [c.id, c]));
  function toCategoryTotal(entries: Map<string, number>): CategoryTotalDTO[] {
    return Array.from(entries.entries())
      .map(([categoryId, total]) => {
        const c = catMap.get(categoryId);
        return {
          categoryId,
          name: c?.name ?? "Sem categoria",
          icon: c?.icon ?? "sparkles",
          color: c?.color ?? "zinc",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  const topExpenseCategories = toCategoryTotal(expenseByCat).slice(0, 8);
  const topIncomeCategories = toCategoryTotal(incomeByCat).slice(0, 8);

  // Insights
  const totalIncome = series.reduce((a, p) => a + p.income, 0);
  const totalExpense = series.reduce((a, p) => a + p.expense, 0);
  const monthsWithActivity = series.filter((p) => p.income > 0 || p.expense > 0).length || 1;
  const avgMonthlyIncome = totalIncome / monthsWithActivity;
  const avgMonthlyExpense = totalExpense / monthsWithActivity;

  let bestSavingMonth: MonthlyPoint | null = null;
  let worstSavingMonth: MonthlyPoint | null = null;
  for (const p of series) {
    if (p.income === 0 && p.expense === 0) continue;
    if (!bestSavingMonth || p.balance > bestSavingMonth.balance) bestSavingMonth = p;
    if (!worstSavingMonth || p.balance < worstSavingMonth.balance) worstSavingMonth = p;
  }

  return {
    period: { months: safeMonths, startIso: start.toISOString(), endIso: end.toISOString() },
    series,
    topExpenseCategories,
    topIncomeCategories,
    insights: {
      totalIncome,
      totalExpense,
      avgMonthlyIncome,
      avgMonthlyExpense,
      bestSavingMonth,
      worstSavingMonth,
      biggestExpenseCategory: topExpenseCategories[0] ?? null,
    },
  };
}

// Gera CSV das transações no período. Retorna string com BOM para Excel pt-BR.
export async function exportTransactionsCSV(months: number = 6): Promise<{
  filename: string;
  content: string;
}> {
  const userId = await requireUserId();
  const safeMonths = Math.min(Math.max(months, 1), 24);
  const { start, end } = rangeForMonths(safeMonths);

  const transactions = await prisma.transaction.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { category: { select: { name: true } } },
  });

  // CSV com separador ; (Excel pt-BR), valores numéricos com vírgula decimal
  const header = ["Data", "Tipo", "Categoria", "Descrição", "Valor"].join(";");
  const rows = transactions.map((t) => {
    const dateStr = t.date.toISOString().split("T")[0]; // YYYY-MM-DD
    const tipo = t.type === "INCOME" ? "Entrada" : "Saída";
    const valor = Number(t.amount.toString()).toFixed(2).replace(".", ",");
    return [dateStr, tipo, csvEscape(t.category.name), csvEscape(t.description), valor].join(";");
  });

  // BOM UTF-8 (﻿) faz o Excel reconhecer acentos
  const content = "﻿" + [header, ...rows].join("\r\n");
  const now = new Date();
  const filename = `finsmart-transacoes-${now.toISOString().split("T")[0]}.csv`;
  return { filename, content };
}

// Escapa aspas e envolve em aspas se contiver separador.
// CWE-1236: previne CSV injection. Excel/Sheets executam células que começam
// com =, +, -, @, TAB ou CR como fórmula — atacante grava uma descrição
// "=HYPERLINK(...)" e ela executa quando o CSV é aberto. Prefixar com '
// neutraliza sem perder legibilidade.
function csvEscape(value: string): string {
  const sanitized = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  const needsQuotes = /[";\n\r]/.test(sanitized);
  const escaped = sanitized.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}
