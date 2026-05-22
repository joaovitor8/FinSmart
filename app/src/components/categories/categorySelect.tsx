"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import type { CategoryDTO } from "@/src/lib/types";

type Props = {
  categories: CategoryDTO[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

// Select reaproveitado: lista categorias com ícone colorido + nome.
export function CategorySelect({
  categories,
  value,
  onChange,
  placeholder = "Selecione",
  disabled,
}: Props) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="bg-secondary/50 border-border">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            Nenhuma categoria. Crie em &quot;Orçamento&quot;.
          </div>
        ) : (
          categories.map((c) => {
            const Icon = categoryIconMap[c.icon];
            const colors = getCategoryColors(c.color);
            return (
              <SelectItem key={c.id} value={c.id}>
                <span className="inline-flex items-center gap-2">
                  {Icon && <Icon className={`h-4 w-4 ${colors.text}`} />}
                  {c.name}
                </span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
