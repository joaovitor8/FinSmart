"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

import { categorySchema, type CategoryInput } from "@/src/lib/schemas";
import {
  categoryIconCatalog,
  categoryColorOptions,
  categoryColorMap,
} from "@/src/lib/constants";
import { createCategory, updateCategory } from "@/src/lib/actions/categories";
import type { CategoryDTO } from "@/src/lib/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryDTO | null; // null = criar; preenchido = editar
};

export function CategoryFormSheet({ open, onOpenChange, category }: Props) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", icon: "sparkles", color: "emerald", type: "EXPENSE" },
  });

  useEffect(() => {
    if (open) {
      reset(
        category
          ? {
              name: category.name,
              icon: category.icon,
              color: category.color,
              type: category.type,
            }
          : { name: "", icon: "sparkles", color: "emerald", type: "EXPENSE" },
      );
    }
  }, [category, open, reset]);

  const icon = watch("icon");
  const color = watch("color");
  const type = watch("type");

  const onSubmit = async (data: CategoryInput) => {
    setLoading(true);
    try {
      if (isEdit && category) {
        await updateCategory(category.id, data);
        toast.success("Categoria atualizada!");
      } else {
        await createCategory(data);
        toast.success("Categoria criada!");
      }
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
          <SheetTitle className="text-foreground text-lg">
            {isEdit ? "Editar categoria" : "Nova categoria"}
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Categorias organizam seus lançamentos e mensalidades.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 px-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cat-name">Nome</Label>
            <Input
              id="cat-name"
              placeholder="Ex: Alimentação, Salário..."
              {...register("name")}
              className="bg-secondary/50 border-border"
            />
            {errors.name && (
              <span className="text-xs text-rose-400">{errors.name.message}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => setValue("type", v as CategoryInput["type"])}
            >
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Saída</SelectItem>
                <SelectItem value="INCOME">Entrada</SelectItem>
                <SelectItem value="BOTH">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Ícone</Label>
            <RadioGroup
              value={icon}
              onValueChange={(v) => setValue("icon", v)}
              className="grid grid-cols-5 gap-2"
            >
              {categoryIconCatalog.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-center justify-center rounded-lg border p-2 cursor-pointer h-12 hover:bg-secondary/80 ${
                    icon === item.value
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-secondary/30 text-muted-foreground"
                  }`}
                  title={item.label}
                >
                  <RadioGroupItem value={item.value} className="sr-only" />
                  <span className="sr-only">{item.label}</span>
                  <item.icon className="h-5 w-5" />
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <Label>Cor</Label>
            <RadioGroup
              value={color}
              onValueChange={(v) => setValue("color", v)}
              className="flex flex-wrap gap-3"
            >
              {categoryColorOptions.map((c) => {
                const styles = categoryColorMap[c];
                return (
                  <label
                    key={c}
                    className="relative flex items-center justify-center cursor-pointer"
                  >
                    <RadioGroupItem value={c} className="sr-only" />
                    <span className="sr-only">{c}</span>
                    <div
                      className={`h-9 w-9 rounded-full ${styles.swatch} transition-all ${
                        color === c
                          ? "ring-2 ring-offset-2 ring-offset-zinc-950 ring-white scale-110"
                          : "opacity-70 hover:opacity-100"
                      }`}
                    />
                  </label>
                );
              })}
            </RadioGroup>
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
            ) : isEdit ? (
              "Salvar Alterações"
            ) : (
              "Criar Categoria"
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
