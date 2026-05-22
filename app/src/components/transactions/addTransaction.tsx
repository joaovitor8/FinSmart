"use client";

import { useMemo, useState } from "react";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { CategorySelect } from "@/src/components/categories/categorySelect";

import { transactionSchema, type TransactionInput } from "@/src/lib/schemas";
import { createTransaction } from "@/src/lib/actions/transactions";
import { dateToInput } from "@/src/lib/format";
import type { CategoryDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
};

export function AddTransaction({ open, onOpenChange, categories }: Props) {
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
      date: dateToInput(new Date()),
    },
  });

  const type = watch("type");
  const categoryId = watch("categoryId");

  // Filtra categorias pelo tipo atual (BOTH aparece em ambos)
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === type || c.type === "BOTH"),
    [categories, type],
  );

  const onSubmit = async (data: TransactionInput) => {
    setLoading(true);
    try {
      await createTransaction(data);
      toast.success("Lançamento salvo!");
      reset({ ...data, description: "", amount: 0 });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-lg">Novo Lançamento</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Registre uma entrada ou saída do seu dinheiro.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-2">
          {/* Toggle entrada/saída */}
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
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Almoço, Uber, Salário..."
              {...register("description")}
              className="bg-secondary/50 border-border"
            />
            {errors.description && (
              <span className="text-xs text-rose-400">{errors.description.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11 shadow-lg shadow-emerald-500/20 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Lançamento"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
