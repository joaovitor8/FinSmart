"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Target, Trash2, Wallet } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { CategoryFormSheet } from "@/src/components/categories/categoryFormSheet";
import { BudgetDialog } from "@/src/components/categories/budgetDialog";

import { deleteCategory } from "@/src/lib/actions/categories";
import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import { formatCurrency } from "@/src/lib/format";
import type { CategoryDTO, CategoryWithBudgetDTO } from "@/src/lib/types";

type Props = {
  categories: CategoryWithBudgetDTO[];
};

// Devolve a cor da barra com base no consumo (verde < 80% < amarelo < 100% < vermelho).
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

export function BudgetView({ categories }: Props) {
  const router = useRouter();

  const [editing, setEditing] = useState<CategoryDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [budgetTarget, setBudgetTarget] = useState<CategoryWithBudgetDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithBudgetDTO | null>(null);

  const groups: { label: string; type: "EXPENSE" | "INCOME" | "BOTH" }[] = [
    { label: "Saídas", type: "EXPENSE" },
    { label: "Entradas", type: "INCOME" },
    { label: "Ambos", type: "BOTH" },
  ];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategory(deleteTarget.id);
      toast.success("Categoria excluída.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Orçamento e Categorias
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize seus gastos e defina limites mensais por categoria
          </p>
        </div>

        <Button
          onClick={() => setCreating(true)}
          className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
            <Tag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Nenhuma categoria
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
            Crie sua primeira categoria para começar a organizar seus lançamentos.
          </p>
          <Button
            onClick={() => setCreating(true)}
            className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </div>
      ) : (
        groups.map((group) => {
          const items = categories.filter((c) => c.type === group.type);
          if (items.length === 0) return null;

          return (
            <section key={group.type} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {group.label}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((c) => {
                  const Icon = categoryIconMap[c.icon] ?? Tag;
                  const colors = getCategoryColors(c.color);
                  const hasBudget = c.budget !== null && c.budget > 0;
                  const pct = hasBudget
                    ? Math.min(Math.round((c.spentThisMonth / (c.budget ?? 1)) * 100), 999)
                    : 0;
                  const tone = progressTone(c.spentThisMonth, c.budget ?? 0);
                  const isIncome = c.type === "INCOME";

                  return (
                    <div
                      key={c.id}
                      className="group rounded-xl border border-border bg-card p-4 hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.badge}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {c.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isIncome
                                ? "Entrada"
                                : c.type === "BOTH"
                                ? "Entrada e saída"
                                : "Saída"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={() => setEditing(c)}
                            aria-label="Editar categoria"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-rose-500"
                            onClick={() => setDeleteTarget(c)}
                            aria-label="Excluir categoria"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Orçamento (só para categorias que aceitam saída) */}
                      {!isIncome && (
                        <>
                          {hasBudget ? (
                            <>
                              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                                <span className="text-muted-foreground">
                                  {formatCurrency(c.spentThisMonth)} /{" "}
                                  {formatCurrency(c.budget ?? 0)}
                                </span>
                                <span className={`font-bold ${tone.label}`}>{pct}%</span>
                              </div>
                              <Progress
                                value={Math.min(pct, 100)}
                                className={`h-2 bg-secondary ${tone.bar}`}
                              />
                              <button
                                onClick={() => setBudgetTarget(c)}
                                className="text-xs text-muted-foreground hover:text-foreground transition mt-2"
                              >
                                Editar orçamento
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setBudgetTarget(c)}
                              className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition"
                            >
                              <Target className="h-3 w-3" />
                              Definir orçamento mensal
                            </button>
                          )}
                        </>
                      )}

                      {isIncome && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Wallet className="h-3 w-3" />
                          Recebido neste mês:{" "}
                          <span className="text-emerald-400 font-mono">
                            {formatCurrency(c.spentThisMonth /* nunca > 0 para income */)}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <CategoryFormSheet
        open={creating || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setCreating(false);
            setEditing(null);
          }
        }}
        category={editing}
      />

      <BudgetDialog
        open={!!budgetTarget}
        onOpenChange={(v) => !v && setBudgetTarget(null)}
        category={budgetTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Excluir categoria?"
        description={`A categoria "${deleteTarget?.name}" será removida. Lançamentos ou mensalidades vinculados impedem a exclusão.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
