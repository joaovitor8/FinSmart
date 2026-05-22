// Mostra cada categoria com orçamento e quanto já foi gasto no mês.
import Link from "next/link";
import { Target, Tag } from "lucide-react";

import { Progress } from "@/src/components/ui/progress";
import { Button } from "@/src/components/ui/button";
import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import { formatCurrency } from "@/src/lib/format";
import type { CategoryWithBudgetDTO } from "@/src/lib/types";

function progressTone(spent: number, budget: number): {
  bar: string;
  label: string;
} {
  if (budget <= 0) return { bar: "[&>div]:bg-zinc-500", label: "text-muted-foreground" };
  const pct = (spent / budget) * 100;
  if (pct >= 100) return { bar: "[&>div]:bg-rose-500", label: "text-rose-400" };
  if (pct >= 80) return { bar: "[&>div]:bg-amber-500", label: "text-amber-400" };
  return { bar: "[&>div]:bg-emerald-500", label: "text-emerald-400" };
}

type Props = {
  budgets: CategoryWithBudgetDTO[];
};

export function BudgetWidget({ budgets }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground">Orçamento do mês</h3>
        </div>
        <Link href="/main/budget">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Gerenciar
          </Button>
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-3">
            <Tag className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Você ainda não definiu orçamentos.
          </p>
          <Link href="/main/budget">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              Definir orçamento
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {budgets.slice(0, 5).map((b) => {
            const Icon = categoryIconMap[b.icon] ?? Tag;
            const colors = getCategoryColors(b.color);
            const limit = b.budget ?? 0;
            const pct = limit > 0
              ? Math.min(Math.round((b.spentThisMonth / limit) * 100), 999)
              : 0;
            const tone = progressTone(b.spentThisMonth, limit);

            return (
              <li key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${colors.badge}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm text-foreground truncate">{b.name}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${tone.label}`}>{pct}%</span>
                </div>
                <Progress
                  value={Math.min(pct, 100)}
                  className={`h-1.5 bg-secondary ${tone.bar}`}
                />
                <p className="text-[11px] text-muted-foreground font-mono mt-1">
                  {formatCurrency(b.spentThisMonth)} / {formatCurrency(limit)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
