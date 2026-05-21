// Server Component: monta a página de relatórios com KPIs, gráficos e top categorias.
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { BalanceLineChart } from "@/src/components/reports/balanceLineChart";
import { ExportButton } from "@/src/components/reports/exportButton";
import { MonthlyBarChart } from "@/src/components/reports/monthlyBarChart";
import { PeriodFilter } from "@/src/components/reports/periodFilter";

import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import { formatCurrency } from "@/src/lib/format";
import type {
  CategoryTotalDTO,
  MonthlyPoint,
  ReportsData,
} from "@/src/lib/actions/reports";

export function ReportsView({ data }: { data: ReportsData }) {
  const { series, topExpenseCategories, topIncomeCategories, insights, period } = data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Relatórios
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Análise dos últimos {period.months} meses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodFilter current={period.months} />
          <ExportButton months={period.months} />
        </div>
      </div>

      {/* KPIs agregados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          label="Entradas no período"
          value={formatCurrency(insights.totalIncome)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
          accent="text-emerald-400"
        />
        <Kpi
          label="Saídas no período"
          value={formatCurrency(insights.totalExpense)}
          icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
          accent="text-rose-400"
        />
        <Kpi
          label="Média mensal (entradas)"
          value={formatCurrency(insights.avgMonthlyIncome)}
          icon={<ArrowUpRight className="h-4 w-4 text-sky-400" />}
        />
        <Kpi
          label="Média mensal (saídas)"
          value={formatCurrency(insights.avgMonthlyExpense)}
          icon={<ArrowDownRight className="h-4 w-4 text-amber-400" />}
        />
      </div>

      {/* Comparativo mensal */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Entradas vs Saídas</h3>
          </div>
        </div>
        <MonthlyBarChart data={series} />
      </div>

      {/* Saldo + insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-foreground">Evolução do saldo</h3>
            </div>
          </div>
          <BalanceLineChart data={series} />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Award className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Destaques</h3>
          </div>
          <ul className="flex flex-col gap-4 text-sm">
            <InsightRow
              label="Melhor mês (saldo)"
              monthLabel={insights.bestSavingMonth?.monthLabel ?? "—"}
              value={
                insights.bestSavingMonth ? formatCurrency(insights.bestSavingMonth.balance) : "—"
              }
              accent="text-emerald-400"
            />
            <InsightRow
              label="Pior mês (saldo)"
              monthLabel={insights.worstSavingMonth?.monthLabel ?? "—"}
              value={
                insights.worstSavingMonth ? formatCurrency(insights.worstSavingMonth.balance) : "—"
              }
              accent={
                insights.worstSavingMonth && insights.worstSavingMonth.balance < 0
                  ? "text-rose-400"
                  : "text-foreground"
              }
            />
            <InsightRow
              label="Maior categoria de saída"
              monthLabel={insights.biggestExpenseCategory?.name ?? "—"}
              value={
                insights.biggestExpenseCategory
                  ? formatCurrency(insights.biggestExpenseCategory.total)
                  : "—"
              }
              accent="text-rose-400"
            />
          </ul>
        </div>
      </div>

      {/* Top categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryRanking title="Top saídas" data={topExpenseCategories} tone="expense" />
        <CategoryRanking title="Top entradas" data={topIncomeCategories} tone="income" />
      </div>
    </div>
  );
}

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
      <p
        className={`text-xl lg:text-2xl font-bold font-mono tracking-tight ${accent ?? "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function InsightRow({
  label,
  monthLabel,
  value,
  accent,
}: {
  label: string;
  monthLabel: string;
  value: string;
  accent: string;
}) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex items-center justify-between">
        <span className="text-foreground">{monthLabel}</span>
        <span className={`font-mono text-sm font-semibold ${accent}`}>{value}</span>
      </div>
    </li>
  );
}

function CategoryRanking({
  title,
  data,
  tone,
}: {
  title: string;
  data: CategoryTotalDTO[];
  tone: "income" | "expense";
}) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const fallback = tone === "income" ? "Sem entradas no período" : "Sem saídas no período";

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-5">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{fallback}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.map((c) => {
            const Icon = categoryIconMap[c.icon] ?? Wallet;
            const colors = getCategoryColors(c.color);
            const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
            return (
              <li key={c.categoryId} className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colors.badge}`}
                >
                  <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate">{c.name}</span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        tone === "income" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(c.total)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full ${colors.swatch}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono w-9 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Tipos só pra deixar explícito o que é Server-only
export type { MonthlyPoint, ReportsData };
