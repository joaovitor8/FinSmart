"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { CategorySelect } from "@/src/components/categories/categorySelect";

import { transactionSchema, type TransactionInput } from "@/src/lib/schemas";
import { updateTransaction } from "@/src/lib/actions/transactions";
import { dateToInput } from "@/src/lib/format";
import type { CategoryDTO, TransactionDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDTO | null;
  categories: CategoryDTO[];
};

export function EditTransaction({ open, onOpenChange, transaction, categories }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      amount: 0,
      description: "",
      categoryId: "",
      date: "",
    },
  });

  useEffect(() => {
    if (transaction && open) {
      reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        categoryId: transaction.category.id,
        date: dateToInput(transaction.date),
      });
    }
  }, [transaction, open, reset]);

  const type = watch("type");
  const categoryId = watch("categoryId");

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "BOTH"),
    [categories, type],
  );

  const onSubmit = async (data: TransactionInput) => {
    if (!transaction) return;
    setLoading(true);
    try {
      await updateTransaction(transaction.id, data);
      toast.success("Lançamento atualizado!");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-lg">Editar Lançamento</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-2">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-secondary/50">
            <button
              type="button"
              onClick={() => {
                setValue("type", "EXPENSE");
                setValue("categoryId", "");
              }}
              className={`py-2 rounded-md text-sm font-medium transition ${
                type === "EXPENSE"
                  ? "bg-rose-500/20 text-rose-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Saída
            </button>
            <button
              type="button"
              onClick={() => {
                setValue("type", "INCOME");
                setValue("categoryId", "");
              }}
              className={`py-2 rounded-md text-sm font-medium transition ${
                type === "INCOME"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrada
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Input
              id="edit-description"
              {...register("description")}
              className="bg-secondary/50 border-border"
            />
            {errors.description && (
              <span className="text-xs text-rose-400">{errors.description.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-amount">Valor (R$)</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount")}
              className="bg-secondary/50 border-border font-mono text-lg"
            />
            {errors.amount && (
              <span className="text-xs text-rose-400">{errors.amount.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Categoria</Label>
              <CategorySelect
                categories={visibleCategories}
                value={categoryId}
                onChange={(id) => setValue("categoryId", id)}
              />
              {errors.categoryId && (
                <span className="text-xs text-rose-400">{errors.categoryId.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                {...register("date")}
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
