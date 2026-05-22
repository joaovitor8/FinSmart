"use client";

import { Download } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { exportTransactionsCSV } from "@/src/lib/actions/reports";

// Chama a action, recebe o conteúdo CSV e dispara o download via blob
export function ExportButton({ months }: { months: number }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { filename, content } = await exportTransactionsCSV(months);
        const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Arquivo exportado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao exportar");
      }
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending} size="sm" variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      {pending ? "Gerando..." : "Exportar CSV"}
    </Button>
  );
}
