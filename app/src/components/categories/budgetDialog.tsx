"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

import { budgetSchema, type BudgetInput } from "@/src/lib/schemas";
import { upsertBudget, deleteBudget } from "@/src/lib/actions/budgets";
import type { CategoryWithBudgetDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryWithBudgetDTO | null;
};

export function BudgetDialog({ open, onOpenChange, category }: Props) {
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { categoryId: "", amount: 0 },
  });

  useEffect(() => {
    if (category && open) {
      reset({ categoryId: category.id, amount: category.budget ?? 0 });
      setValue("categoryId", category.id);
    }
  }, [category, open, reset, setValue]);

  const onSubmit = async (data: BudgetInput) => {
    setLoading(true);
    try {
      await upsertBudget(data);
      toast.success("Orçamento salvo!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar orçamento.");
    } finally {
      setLoading(false);
    }
  };

  const onRemove = async () => {
    if (!category) return;
    setRemoving(true);
    try {
      await deleteBudget(category.id);
      toast.success("Orçamento removido.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setRemoving(false);
    }
  };

  const hasExisting = !!category?.budget;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>
            {hasExisting ? "Editar orçamento" : "Definir orçamento"}
          </DialogTitle>
          <DialogDescription>
            Limite mensal de gasto para a categoria{" "}
            <span className="text-foreground font-medium">{category?.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form id="budget-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input type="hidden" {...register("categoryId")} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="budget-amount">Limite mensal (R$)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              {...register("amount")}
              className="bg-secondary/50 border-border font-mono text-lg"
            />
            {errors.amount && (
              <span className="text-xs text-rose-400">{errors.amount.message}</span>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {hasExisting && (
              <Button
                variant="outline"
                onClick={onRemove}
                disabled={loading || removing}
                className="text-rose-400"
              >
                {removing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remover
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || removing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="budget-form"
              disabled={loading || removing}
              className="bg-emerald-500 hover:bg-emerald-600 text-background"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
