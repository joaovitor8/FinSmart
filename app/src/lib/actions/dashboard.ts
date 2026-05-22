"use server";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import type {
  CategoryWithBudgetDTO,
  GoalDTO,
  TransactionDTO,
} from "@/src/lib/types";

// Gasto por categoria no mês (com cor/ícone para o gráfico)
export type CategorySpentDTO = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
};

export type DashboardData = {
  kpis: {
    income: number;
    expense: number;
    balance: number;
    monthlyFeesTotal: number;
  };
  byCategory: CategorySpentDTO[];
  recentTransactions: TransactionDTO[];
  goals: GoalDTO[];
  budgets: CategoryWithBudgetDTO[]; // só categorias com budget definido
};

// Início/fim do mês corrente em UTC.
function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

// Carrega tudo que o dashboard precisa em paralelo.
export async function getDashboardData(): Promise<DashboardData> {
  const userId = await requireUserId();
  const { start, end } = currentMonthRange();

  const [transactions, goals, fees, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: { date: "desc" },
      include: { category: true },
    }),
    prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.monthlyFees.findMany({ where: { userId } }),
    prisma.category.findMany({
      where: { userId },
      include: { budget: true },
    }),
  ]);

  // --- KPIs do mês ---
  let income = 0;
  let expense = 0;
  const spentByCategory = new Map<string, number>();

  for (const t of transactions) {
    const amount = Number(t.amount.toString());
    if (t.type === "INCOME") {
      income += amount;
    } else {
      expense += amount;
      spentByCategory.set(t.category.id, (spentByCategory.get(t.category.id) ?? 0) + amount);
    }
  }

  // --- Total mensal das mensalidades (Anual / 12 para diluir) ---
  let monthlyFeesTotal = 0;
  for (const f of fees) {
    const amount = Number(f.amount.toString());
    monthlyFeesTotal += f.frequency === "Anual" ? amount / 12 : amount;
  }

  // --- Gastos por categoria (precisa de cor/ícone vindos da categoria) ---
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const byCategory: CategorySpentDTO[] = Array.from(spentByCategory.entries())
    .map(([categoryId, total]) => {
      const c = categoryMap.get(categoryId);
      return {
        categoryId,
        name: c?.name ?? "Sem categoria",
        color: c?.color ?? "zinc",
        icon: c?.icon ?? "sparkles",
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  // --- Transações recentes (5 mais novas do mês) ---
  const recentTransactions: TransactionDTO[] = transactions.slice(0, 5).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount.toString()),
    description: t.description,
    category: {
      id: t.category.id,
      name: t.category.name,
      icon: t.category.icon,
      color: t.category.color,
      type: t.category.type,
    },
    date: t.date.toISOString(),
  }));

  // --- Metas ---
  const goalsDTO: GoalDTO[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    target: Number(g.target.toString()),
    current: Number(g.current.toString()),
    icon: g.icon,
    color: g.color,
  }));

  // --- Orçamentos (só categorias com budget) com progresso do mês ---
  const budgets: CategoryWithBudgetDTO[] = categories
    .filter((c) => c.budget !== null && c.type !== "INCOME")
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      budget: c.budget ? Number(c.budget.amount.toString()) : null,
      spentThisMonth: spentByCategory.get(c.id) ?? 0,
    }))
    .sort((a, b) => {
      const pa = a.budget ? a.spentThisMonth / a.budget : 0;
      const pb = b.budget ? b.spentThisMonth / b.budget : 0;
      return pb - pa;
    });

  return {
    kpis: { income, expense, balance: income - expense, monthlyFeesTotal },
    byCategory,
    recentTransactions,
    goals: goalsDTO,
    budgets,
  };
}
