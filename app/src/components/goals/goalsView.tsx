"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Target } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Progress } from "@/src/components/ui/progress";
import { Input } from "@/src/components/ui/input";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { NewGoal } from "@/src/components/goals/addGoal";
import { EditGoal } from "@/src/components/goals/editGoal";

import { goalIconMap, goalColorClasses } from "@/src/lib/constants";
import { addToGoalProgress, deleteGoal } from "@/src/lib/actions/goals";
import { formatCurrency } from "@/src/lib/format";
import type { GoalDTO } from "@/src/lib/types";

type Props = {
  goals: GoalDTO[];
};

export function GoalsView({ goals }: Props) {
  const router = useRouter();
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalDTO | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalDTO | null>(null);

  const handleAdd = async (goalId: string) => {
    const amountString = addAmounts[goalId];
    const amount = parseFloat(amountString);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await addToGoalProgress(goalId, { amount });
      toast.success("Valor adicionado!");
      setAddAmounts((prev) => {
        const next = { ...prev };
        delete next[goalId];
        return next;
      });
      router.refresh();
    } catch {
      toast.error("Erro ao atualizar progresso.");
    }
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    try {
      await deleteGoal(goalToDelete.id);
      toast.success("Meta excluída!");
      router.refresh();
    } catch {
      toast.error("Erro ao excluir meta.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Metas Financeiras
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o progresso dos seus objetivos
          </p>
        </div>

        <Button
          onClick={() => setIsSheetOpen(true)}
          className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      <NewGoal open={isSheetOpen} onOpenChange={setIsSheetOpen} />
      <EditGoal open={isEditOpen} onOpenChange={setIsEditOpen} goal={goalToEdit} />
      <ConfirmDialog
        open={!!goalToDelete}
        onOpenChange={(v) => !v && setGoalToDelete(null)}
        title="Excluir meta?"
        description={`A meta "${goalToDelete?.name}" será removida permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
            <Target className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Nenhuma meta criada
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
            Crie sua primeira meta financeira e comece a acompanhar seu progresso.
          </p>
          <Button
            onClick={() => setIsSheetOpen(true)}
            className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Criar Meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const Icon = goalIconMap[goal.icon] ?? Target;
            const colors = goalColorClasses[goal.color] ?? goalColorClasses.emerald;
            const percentage =
              goal.target > 0
                ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
                : 0;
            const remaining = Math.max(goal.target - goal.current, 0);

            return (
              <div
                key={goal.id}
                className={`group rounded-xl border border-border bg-card p-6 transition-all duration-300 ${colors.border} hover:shadow-lg`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">
                        {goal.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Faltam {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold font-mono ${colors.text}`}>
                    {percentage}%
                  </span>
                </div>

                <Progress
                  value={percentage}
                  className={`h-2.5 bg-secondary mb-4 ${colors.progress}`}
                />

                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Atual</p>
                    <p className="text-sm font-semibold text-foreground font-mono">
                      {formatCurrency(goal.current)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Alvo</p>
                    <p className="text-sm font-semibold text-foreground font-mono">
                      {formatCurrency(goal.target)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="R$ 0,00"
                    value={addAmounts[goal.id] ?? ""}
                    onChange={(e) =>
                      setAddAmounts((prev) => ({ ...prev, [goal.id]: e.target.value }))
                    }
                    className="bg-secondary/50 border-border text-sm font-mono h-9"
                  />
                  <Button
                    onClick={() => handleAdd(goal.id)}
                    disabled={
                      !addAmounts[goal.id] || parseFloat(addAmounts[goal.id]) <= 0
                    }
                    size="sm"
                    className="bg-emerald-500 text-background hover:bg-emerald-600 font-medium h-9 px-4 shrink-0"
                    aria-label="Adicionar valor"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-end gap-1 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-white"
                    onClick={() => {
                      setGoalToEdit(goal);
                      setIsEditOpen(true);
                    }}
                    aria-label="Editar meta"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-rose-500"
                    onClick={() => setGoalToDelete(goal)}
                    aria-label="Excluir meta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
