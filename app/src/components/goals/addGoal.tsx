"use client";

import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";

import { goalCreateSchema, type GoalCreateInput } from "@/src/lib/schemas";
import { goalIcons, goalColors } from "@/src/lib/constants";
import { createGoal } from "@/src/lib/actions/goals";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NewGoal({ open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalCreateInput>({
    resolver: zodResolver(goalCreateSchema),
    defaultValues: { name: "", target: 0, icon: "target", color: "emerald" },
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  const onSubmit = async (data: GoalCreateInput) => {
    setLoading(true);
    try {
      await createGoal(data);
      toast.success("Meta criada com sucesso!");
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao criar meta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-foreground text-lg">Nova Meta</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Defina um objetivo financeiro para alcançar.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 px-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do Objetivo</Label>
            <Input
              id="name"
              placeholder="Ex: Viagem para Europa, PS5..."
              {...register("name")}
              className="bg-secondary/50 border-border"
            />
            {errors.name && (
              <span className="text-xs text-rose-400">{errors.name.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="target">Quanto você precisa? (R$)</Label>
            <Input
              id="target"
              type="number"
              step="0.01"
              min="1"
              placeholder="0,00"
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
              onValueChange={(v) => setValue("icon", v as GoalCreateInput["icon"])}
              className="grid grid-cols-5 gap-2"
            >
              {goalIcons.map((item) => (
                <label
                  key={item.value}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-2 cursor-pointer transition-all h-20 hover:bg-secondary/80 ${
                    selectedIcon === item.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-secondary/30 text-muted-foreground"
                  }`}
                >
                  <RadioGroupItem value={item.value} className="sr-only" />
                  <item.icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Cor do Card</Label>
            <RadioGroup
              value={selectedColor}
              onValueChange={(v) => setValue("color", v as GoalCreateInput["color"])}
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
                        : "opacity-70 group-hover:opacity-100"
                    }`}
                  />
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11 shadow-lg shadow-emerald-500/20 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando Meta...
              </>
            ) : (
              "Criar Meta"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
