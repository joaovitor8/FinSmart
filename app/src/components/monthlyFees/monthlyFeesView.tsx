"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react";

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

import { AddMonthlyFees } from "@/src/components/monthlyFees/addMonthlyFees";
import { EditMonthlyFee } from "@/src/components/monthlyFees/editMonthlyFees";

import { deleteMonthlyFee } from "@/src/lib/actions/monthlyFees";
import { categoryIconMap, getCategoryColors } from "@/src/lib/constants";
import { formatCurrency, formatDateBR } from "@/src/lib/format";
import type { CategoryDTO, MonthlyFeeDTO } from "@/src/lib/types";

const ITEMS_PER_PAGE = 8;

type Props = {
  fees: MonthlyFeeDTO[];
  categories: CategoryDTO[];
};

export function MonthlyFeesView({ fees, categories }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const [feeToEdit, setFeeToEdit] = useState<MonthlyFeeDTO | null>(null);
  const [feeToDelete, setFeeToDelete] = useState<MonthlyFeeDTO | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return fees.filter((fee) => {
      const matchSearch =
        fee.name.toLowerCase().includes(s) ||
        fee.category.name.toLowerCase().includes(s);
      const matchMonth = monthFilter === "all" || fee.date.startsWith(monthFilter);
      return matchSearch && matchMonth;
    });
  }, [fees, search, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const uniqueMonths = useMemo(() => {
    const months = new Set(fees.map((f) => f.date.slice(0, 7)).filter(Boolean));
    return Array.from(months).sort().reverse();
  }, [fees]);

  const handleDelete = async () => {
    if (!feeToDelete) return;
    try {
      await deleteMonthlyFee(feeToDelete.id);
      toast.success("Mensalidade removida!");
      router.refresh();
    } catch {
      toast.error("Erro ao excluir mensalidade.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
            Mensalidades
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas assinaturas e contas fixas mensais
          </p>
        </div>

        <Button
          onClick={() => setModalOpen(true)}
          className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Mensalidade
        </Button>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar serviço..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card border-border"
          />
        </div>

        <Select
          value={monthFilter}
          onValueChange={(v) => {
            setMonthFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40 bg-card border-border">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Meses</SelectItem>
            {uniqueMonths.map((m) => {
              const [year, month] = m.split("-");
              const label = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString(
                "pt-BR",
                { month: "short", year: "numeric" },
              );
              return (
                <SelectItem key={m} value={m}>
                  <span className="capitalize">{label}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
            <Receipt className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Nenhuma mensalidade encontrada
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
            Comece adicionando suas assinaturas para ter controle dos seus gastos fixos.
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-emerald-500 text-background hover:bg-emerald-600 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Mensalidade
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Serviço
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Categoria
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Frequência
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Data de Aquisição
                  </TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
                    Valor
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginated.map((fee) => {
                  const Icon = categoryIconMap[fee.category.icon];
                  const colors = getCategoryColors(fee.category.color);
                  return (
                    <TableRow
                      key={fee.id}
                      className="border-border hover:bg-secondary/30 transition-colors"
                    >
                      <TableCell className="font-medium text-foreground">{fee.name}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${colors.badge}`}
                        >
                          {Icon && <Icon className="h-3 w-3" />}
                          {fee.category.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {fee.frequency}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateBR(fee.date)}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono text-foreground">
                        {formatCurrency(fee.amount)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              aria-label="Ações da mensalidade"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => {
                                setFeeToEdit(fee);
                                setEditModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer text-rose-400 focus:text-rose-400"
                              onClick={() => setFeeToDelete(fee)}
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
            {filtered.length} mensalidade(s) encontrada(s)
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

      <AddMonthlyFees
        open={modalOpen}
        onOpenChange={setModalOpen}
        categories={categories}
      />
      <EditMonthlyFee
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        fee={feeToEdit}
        categories={categories}
      />
      <ConfirmDialog
        open={!!feeToDelete}
        onOpenChange={(v) => !v && setFeeToDelete(null)}
        title="Excluir mensalidade?"
        description={`A mensalidade "${feeToDelete?.name}" será removida permanentemente.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
