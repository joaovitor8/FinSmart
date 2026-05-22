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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { CategorySelect } from "@/src/components/categories/categorySelect";

import { monthlyFeeSchema, type MonthlyFeeInput } from "@/src/lib/schemas";
import { createMonthlyFee } from "@/src/lib/actions/monthlyFees";
import type { CategoryDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
};

export function AddMonthlyFees({ open, onOpenChange, categories }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MonthlyFeeInput>({
    resolver: zodResolver(monthlyFeeSchema),
    defaultValues: {
      name: "",
      amount: 0,
      categoryId: "",
      frequency: "Mensal",
      date: "",
    },
  });

  const categoryId = watch("categoryId");
  const frequency = watch("frequency");

  // Mensalidade é sempre saída: só EXPENSE + BOTH
  const visibleCategories = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE" || c.type === "BOTH"),
    [categories],
  );

  const onSubmit = async (data: MonthlyFeeInput) => {
    setLoading(true);
    try {
      await createMonthlyFee(data);
      toast.success("Mensalidade salva!");
      reset();
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
          <SheetTitle className="text-foreground text-lg">Nova Mensalidade</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Adicione uma nova assinatura ou conta fixa ao seu controle.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Serviço / Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Netflix, Internet, Academia..."
              {...register("name")}
              className="bg-secondary/50 border-border"
            />
            {errors.name && <span className="text-xs text-rose-400">{errors.name.message}</span>}
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
              className="bg-secondary/50 border-border font-mono"
            />
            {errors.amount && <span className="text-xs text-rose-400">{errors.amount.message}</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
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
              <Label>Frequência</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setValue("frequency", v as MonthlyFeeInput["frequency"])}
              >
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                {...register("date")}
                className="bg-secondary/50 border-border"
              />
              {errors.date && <span className="text-xs text-rose-400">{errors.date.message}</span>}
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
              "Salvar Mensalidade"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
