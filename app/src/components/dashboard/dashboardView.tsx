// Server Component: monta o dashboard com KPIs, gráfico e listas.
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import {
  ExpenseChart,
  ExpenseChartLegend,
} from "@/src/components/dashboard/expenseChart";
import { BudgetWidget } from "@/src/components/dashboard/budgetWidget";
import { Progress } from "@/src/components/ui/progress";
import { Button } from "@/src/components/ui/button";

import { getDashboardData } from "@/src/lib/actions/dashboard";
import {
  categoryIconMap,
  getCategoryColors,
  goalColorClasses,
  goalIconMap,
} from "@/src/lib/constants";
import { formatCurrency, formatDateBR } from "@/src/lib/format";

export async function DashboardView() {
  const data = await getDashboardData();
  const { kpis, byCategory, recentTransactions, goals, budgets } = data;

  const monthLabel = new Date()
    .toLocaleString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
          Visão geral
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{monthLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Entradas do mês"
          value={formatCurrency(kpis.income)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          accent="text-emerald-400"
        />
        <Kpi
          label="Saídas do mês"
          value={formatCurrency(kpis.expense)}
          icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
          accent="text-rose-400"
        />
        <Kpi
          label="Saldo do mês"
          value={formatCurrency(kpis.balance)}
          icon={<Wallet className="h-4 w-4 text-sky-400" />}
          accent={kpis.balance >= 0 ? "text-foreground" : "text-rose-400"}
        />
        <Kpi
          label="Mensalidades / mês"
          value={formatCurrency(kpis.monthlyFeesTotal)}
          icon={<Receipt className="h-4 w-4 text-amber-400" />}
        />
      </div>

      {/* Linha 1: lançamentos recentes + gráfico de categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Lançamentos recentes</h3>
            <Link href="/main/transactions">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Ver tudo
              </Button>
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum lançamento neste mês ainda.
            </p>
          ) : (
            <ul className="flex flex-col">
              {recentTransactions.map((t) => {
                const Icon = categoryIconMap[t.category.icon] ?? Wallet;
                const colors = getCategoryColors(t.category.color);
                const isIncome = t.type === "INCOME";
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 py-3 border-b border-border last:border-b-0"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      {isIncome ? (
                        <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-rose-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.description}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Icon className={`h-3 w-3 ${colors.text}`} />
                        {t.category.name} · {formatDateBR(t.date)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold font-mono ${
                        isIncome ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Gastos por categoria</h3>
          <p className="text-xs text-muted-foreground mb-4">Mês corrente</p>
          <ExpenseChart data={byCategory} />
          <ExpenseChartLegend data={byCategory} />
        </div>
      </div>

      {/* Linha 2: orçamento + metas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetWidget budgets={budgets} />

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-foreground">Suas metas</h3>
            </div>
            <Link href="/main/goals">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Gerenciar
              </Button>
            </Link>
          </div>

          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Você ainda não criou nenhuma meta.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {goals.slice(0, 4).map((g) => {
                const Icon = goalIconMap[g.icon] ?? Target;
                const colors = goalColorClasses[g.color] ?? goalColorClasses.emerald;
                const pct =
                  g.target > 0
                    ? Math.min(Math.round((g.current / g.target) * 100), 100)
                    : 0;

                return (
                  <li key={g.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${colors.bg}`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                        </div>
                        <span className="text-sm text-foreground truncate">{g.name}</span>
                      </div>
                      <span className={`text-xs font-bold font-mono ${colors.text}`}>
                        {pct}%
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-1.5 bg-secondary ${colors.progress}`}
                    />
                    <p className="text-[11px] text-muted-foreground font-mono mt-1">
                      {formatCurrency(g.current)} / {formatCurrency(g.target)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Card simples de KPI usado no topo do dashboard.
function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold font-mono tracking-tight ${accent ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
