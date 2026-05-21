"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

const OPTIONS = [
  { value: 3, label: "3M" },
  { value: 6, label: "6M" },
  { value: 12, label: "12M" },
  { value: 24, label: "24M" },
] as const;

// Filtro de período: troca ?months=N na URL e a página (Server Component) refaz a query.
export function PeriodFilter({ current }: { current: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setMonths(months: number) {
    const sp = new URLSearchParams(params.toString());
    sp.set("months", String(months));
    startTransition(() => router.push(`?${sp.toString()}`));
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant="ghost"
          onClick={() => setMonths(o.value)}
          disabled={pending}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-colors",
            current === o.value
              ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-400"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
