"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";

import { importTransactions } from "@/src/lib/actions/transactions";
import { parseCsv, suggestCategory, type ParsedRow } from "@/src/lib/csvImport";
import { formatCurrency } from "@/src/lib/format";
import type { CategoryDTO } from "@/src/lib/types";

type Row = ParsedRow & { categoryId: string | null; selected: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryDTO[];
};

export function ImportTransactionsSheet({ open, onOpenChange, categories }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result = parseCsv(text);
      const mapped: Row[] = result.rows.map((r) => ({
        ...r,
        categoryId: suggestCategory(r.description, r.type, categories),
        selected: true,
      }));
      setRows(mapped);
      setWarnings(result.warnings);
      setFileName(file.name);
      if (mapped.length === 0) {
        toast.error("Não consegui ler o CSV — verifique se há colunas de data, descrição e valor.");
      } else {
        toast.success(`${mapped.length} lançamentos lidos`);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function reset() {
    setRows([]);
    setWarnings([]);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function toggleAll(selected: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, selected })));
  }

  const validRows = rows.filter((r) => r.selected && r.categoryId);
  const skipped = rows.filter((r) => r.selected && !r.categoryId);
  const totalSelected = rows.filter((r) => r.selected).length;

  function submit() {
    if (validRows.length === 0) {
      toast.error("Selecione e categorize ao menos 1 lançamento.");
      return;
    }
    startTransition(async () => {
      try {
        const { imported } = await importTransactions({
          items: validRows.map((r) => ({
            type: r.type,
            amount: r.amount,
            description: r.description,
            categoryId: r.categoryId!,
            date: r.date,
          })),
        });
        toast.success(`${imported} lançamento(s) importado(s)`);
        reset();
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao importar");
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent
        side="right"
        className="bg-card border-border w-full sm:max-w-2xl overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Importar extrato</SheetTitle>
          <SheetDescription>
            Envie um CSV do seu banco. Detectamos data, descrição e valor automaticamente, e
            sugerimos uma categoria por palavras-chave.
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 mt-6 flex flex-col gap-4">
          {rows.length === 0 ? (
            <UploadArea
              fileInputRef={fileInputRef}
              onPickFile={handleFile}
              warnings={warnings}
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[16rem]">{fileName}</span>
                  <span className="text-xs">·</span>
                  <span className="text-xs">{rows.length} linha(s)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  Trocar arquivo
                </Button>
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Avisos do parser
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {warnings.slice(0, 5).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {warnings.length > 5 && <li>... e mais {warnings.length - 5}</li>}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => toggleAll(totalSelected !== rows.length)}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  {totalSelected === rows.length ? "Desmarcar todos" : "Marcar todos"}
                </button>
                <span className="text-muted-foreground">
                  {validRows.length} pronto(s){" "}
                  {skipped.length > 0 && (
                    <span className="text-amber-400">· {skipped.length} sem categoria</span>
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto pr-1">
                {rows.map((r, i) => (
                  <RowCard
                    key={i}
                    row={r}
                    categories={categories}
                    onChange={(patch) => updateRow(i, patch)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <SheetFooter className="px-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={pending || validRows.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-background font-semibold"
          >
            {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {validRows.length > 0 ? `(${validRows.length})` : ""}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function UploadArea({
  fileInputRef,
  onPickFile,
  warnings,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (file: File) => void;
  warnings: string[];
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <Upload className="h-6 w-6 text-emerald-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Selecione um arquivo CSV</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Aceito o formato padrão dos bancos brasileiros (separador <code>;</code> ou{" "}
          <code>,</code>; vírgula decimal). Valores negativos viram saídas.
        </p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
        }}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-emerald-500 hover:bg-emerald-600 text-background"
      >
        <Upload className="h-4 w-4 mr-2" />
        Escolher arquivo
      </Button>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300 w-full">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertCircle className="h-3.5 w-3.5" />
            Não consegui interpretar o arquivo
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RowCard({
  row,
  categories,
  onChange,
}: {
  row: Row;
  categories: CategoryDTO[];
  onChange: (patch: Partial<Row>) => void;
}) {
  const compatibleCats = categories.filter(
    (c) => c.type === "BOTH" || c.type === row.type,
  );

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        row.selected ? "border-border bg-secondary/30" : "border-border/40 bg-transparent opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.selected}
          onChange={(e) => onChange({ selected: e.target.checked })}
          className="mt-1 h-4 w-4 accent-emerald-500"
        />
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Input
              value={row.description}
              onChange={(e) => onChange({ description: e.target.value })}
              className="bg-card border-border h-8 text-sm flex-1"
            />
            <span
              className={`text-sm font-semibold font-mono whitespace-nowrap ${
                row.type === "INCOME" ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {row.type === "INCOME" ? "+" : "-"}
              {formatCurrency(row.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-16">{row.date}</span>
            <Select
              value={row.type}
              onValueChange={(v) => {
                const newType = v as "INCOME" | "EXPENSE";
                // Se categoria atual não combina com o novo tipo, limpa
                const cat = categories.find((c) => c.id === row.categoryId);
                const stillOk = cat && (cat.type === "BOTH" || cat.type === newType);
                onChange({
                  type: newType,
                  categoryId: stillOk ? row.categoryId : null,
                });
              }}
            >
              <SelectTrigger className="h-8 w-24 bg-card border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Entrada</SelectItem>
                <SelectItem value="EXPENSE">Saída</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={row.categoryId ?? ""}
              onValueChange={(v) => onChange({ categoryId: v })}
            >
              <SelectTrigger
                className={`h-8 flex-1 bg-card border-border text-xs ${
                  !row.categoryId ? "text-amber-400 border-amber-500/40" : ""
                }`}
              >
                <SelectValue placeholder="Escolher categoria" />
              </SelectTrigger>
              <SelectContent>
                {compatibleCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
