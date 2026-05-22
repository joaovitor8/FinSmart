"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";

import { goalUpdateSchema, type GoalUpdateInput } from "@/src/lib/schemas";
import { goalIcons, goalColors } from "@/src/lib/constants";
import { updateGoal } from "@/src/lib/actions/goals";
import type { GoalDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: GoalDTO | null;
};

export function EditGoal({ open, onOpenChange, goal }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalUpdateInput>({
    resolver: zodResolver(goalUpdateSchema),
    defaultValues: { name: "", target: 0, icon: "target", color: "emerald" },
  });

  // Preenche o form sempre que abrir uma meta diferente
  useEffect(() => {
    if (goal && open) {
      reset({
        name: goal.name,
        target: goal.target,
        icon: goal.icon as GoalUpdateInput["icon"],
        color: goal.color as GoalUpdateInput["color"],
      });
    }
  }, [goal, open, reset]);

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  const onSubmit = async (data: GoalUpdateInput) => {
    if (!goal) return;
    setLoading(true);
    try {
      await updateGoal(goal.id, data);
      toast.success("Meta atualizada!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar meta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-lg">Editar Meta</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 px-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Nome do Objetivo</Label>
            <Input
              id="edit-name"
              {...register("name")}
              className="bg-secondary/50 border-border"
            />
            {errors.name && (
              <span className="text-xs text-rose-400">{errors.name.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-target">Novo Valor Alvo (R$)</Label>
            <Input
              id="edit-target"
              type="number"
              step="0.01"
              min="1"
              {...register("target")}
              className="bg-secondary/50 border-border font-mono text-lg"
            />
            {errors.target && (
              <span className="text-xs text-rose-400">{errors.target.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Label>Ícone</Label>
            <RadioGroup
              value={selectedIcon}
              onValueChange={(v) => setValue("icon", v as GoalUpdateInput["icon"])}
              className="grid grid-cols-5 gap-2"
            >
              {goalIcons.map((item) => (
                <label
                  key={item.value}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-2 cursor-pointer h-20 hover:bg-secondary/80 ${
                    selectedIcon === item.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-secondary/30 text-muted-foreground"
                  }`}
                >
                  <RadioGroupItem value={item.value} className="sr-only" />
                  <item.icon className="h-6 w-6" />
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Cor</Label>
            <RadioGroup
              value={selectedColor}
              onValueChange={(v) => setValue("color", v as GoalUpdateInput["color"])}
              className="flex gap-4"
            >
              {goalColors.map((c) => (
                <label key={c.value} className="relative flex items-center justify-center cursor-pointer group">
                  <RadioGroupItem value={c.value} className="sr-only" />
                  <span className="sr-only">{c.value}</span>
                  <div
                    className={`h-10 w-10 rounded-full ${c.bg} transition-all ${
                      selectedColor === c.value
                        ? `ring-2 ring-offset-2 ring-offset-zinc-950 ${c.ring} scale-110`
                        : "opacity-70"
                    }`}
                  />
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11 mt-4"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Salvar Alterações"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
