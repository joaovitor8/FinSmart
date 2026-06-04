"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";

import { AddTransaction } from "@/src/components/transactions/addTransaction";
import { EditTransaction } from "@/src/components/transactions/editTransaction";
import { ImportTransactionsSheet } from "@/src/components/transactions/importTransactionsSheet";

import { deleteTransaction } from "@/src/lib/actions/transactions";
import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import { formatCurrency, formatDateBR } from "@/src/lib/format";
import type { CategoryDTO, TransactionDTO } from "@/src/lib/types";

const ITEMS_PER_PAGE = 10;

type Period = "all" | "30d" | "90d" | "thisMonth" | "lastMonth" | "thisYear";

type Props = {
  transactions: TransactionDTO[];
  categories: CategoryDTO[];
};

// Intervalo de datas (UTC) baseado no período escolhido. null = sem limite.
function periodRange(period: Period): { gte: Date | null; lt: Date | null } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (period) {
    case "30d":
      return { gte: new Date(Date.now() - 30 * 86_400_000), lt: null };
    case "90d":
      return { gte: new Date(Date.now() - 90 * 86_400_000), lt: null };
    case "thisMonth":
      return {
        gte: new Date(Date.UTC(y, m, 1)),
        lt: new Date(Date.UTC(y, m + 1, 1)),
      };
    case "lastMonth":
      return {
        gte: new Date(Date.UTC(y, m - 1, 1)),
        lt: new Date(Date.UTC(y, m, 1)),
      };
    case "thisYear":
      return { gte: new Date(Date.UTC(y, 0, 1)), lt: null };
    default:
      return { gte: null, lt: null };
  }
}

export function TransactionsView({ transactions, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "INCOME" | "EXPENSE">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<Period>("all");
  const [page, setPage] = useState(1);

  const [editTarget, setEditTarget] = useState<TransactionDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TransactionDTO | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const hasActiveFilters =
    !!search || typeFilter !== "all" || categoryFilter !== "all" || periodFilter !== "all";

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const { gte, lt } = periodRange(periodFilter);
    return transactions.filter((t) => {
      const matchSearch =
        t.description.toLowerCase().includes(s) ||
        t.category.name.toLowerCase().includes(s);
      const matchType = typeFilter === "all" || t.type === typeFilter;
      const matchCategory = categoryFilter === "all" || t.category.id === categoryFilter;
      const date = new Date(t.date);
      const matchPeriod = (!gte || date >= gte) && (!lt || date < lt);
      return matchSearch && matchType && matchCategory && matchPeriod;
    });
  }, [transactions, search, typeFilter, categoryFilter, periodFilter]);

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setPeriodFilter("all");
    setPage(1);
  }

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filtered) {
      if (t.type === "INCOME") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTransaction(deleteTarget.id);
      toast.success("Lançamento removido!");
      router.refresh();
    } catch {
      toast.error("Erro ao excluir lançamento.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Lançamentos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entradas e saídas do seu dia-a-dia
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="border-border bg-card text-foreground"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar
          </Button>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold shadow-lg shadow-emerald-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Resumo do filtro atual */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-base font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(totals.income)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saídas</p>
          <p className="text-base font-bold font-mono text-rose-400 mt-1">
            {formatCurrency(totals.expense)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p
            className={`text-base font-bold font-mono mt-1 ${
              totals.balance >= 0 ? "text-foreground" : "text-rose-400"
            }`}
          >
            {formatCurrency(totals.balance)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
        <div className="relative flex-1 min-w-45 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card border-border"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v as typeof typeFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-36 bg-card border-border">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="INCOME">Entradas</SelectItem>
            <SelectItem value="EXPENSE">Saídas</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48 bg-card border-border">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={periodFilter}
          onValueChange={(v) => {
            setPeriodFilter(v as Period);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 bg-card border-border">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="thisMonth">Este mês</SelectItem>
            <SelectItem value="lastMonth">Mês passado</SelectItem>
            <SelectItem value="thisYear">Este ano</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
            <Wallet className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Nenhum lançamento ainda
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
            Registre suas entradas e saídas para ver para onde seu dinheiro está indo.
          </p>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Lançamento
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Categoria
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Valor
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.map((t) => {
                  const Icon = categoryIconMap[t.category.icon] ?? Wallet;
                  const colors = getCategoryColors(t.category.color);
                  const isIncome = t.type === "INCOME";
                  return (
                    <TableRow
                      key={t.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                            {isIncome ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-rose-400" />
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {t.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${colors.badge}`}
                        >
                          <Icon className="h-3 w-3" />
                          {t.category.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateBR(t.date)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold font-mono ${
                          isIncome ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Ações do lançamento"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => {
                                setEditTarget(t);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-rose-400 focus:text-rose-400"
                              onClick={() => setDeleteTarget(t)}
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} lançamento(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 border-border bg-card text-foreground"
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 border-border bg-card text-foreground"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      <AddTransaction open={addOpen} onOpenChange={setAddOpen} categories={categories} />
      <EditTransaction
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={editTarget}
        categories={categories}
      />
      <ImportTransactionsSheet
        open={importOpen}
        onOpenChange={setImportOpen}
        categories={categories}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Excluir lançamento?"
        description={`O lançamento "${deleteTarget?.description}" será removido permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
