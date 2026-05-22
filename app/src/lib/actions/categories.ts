"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { categorySchema } from "@/src/lib/schemas";
import type { CategoryDTO, CategoryWithBudgetDTO } from "@/src/lib/types";

// --- helpers ---

function toCategoryDTO(c: {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
}): CategoryDTO {
  return { id: c.id, name: c.name, icon: c.icon, color: c.color, type: c.type };
}

// Início/fim do mês corrente em UTC.
function currentMonthRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

// --- queries ---

// Lista as categorias do usuário (opcionalmente filtradas para uso em formulário).
export async function listCategories(filter?: {
  forType?: "INCOME" | "EXPENSE";
}): Promise<CategoryDTO[]> {
  const userId = await requireUserId();

  const where = filter?.forType
    ? { userId, type: { in: [filter.forType, "BOTH" as const] } }
    : { userId };

  const items = await prisma.category.findMany({
    where,
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return items.map(toCategoryDTO);
}

// Lista categorias com budget e gasto do mês corrente (página /main/budget).
export async function listCategoriesWithBudget(): Promise<CategoryWithBudgetDTO[]> {
  const userId = await requireUserId();
  const { start, end } = currentMonthRange();

  const [categories, totals] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      include: { budget: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    // Soma agrupada por categoria + tipo no mês corrente
    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: { userId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    }),
  ]);

  // Para EXPENSE acumula em "spent"; para INCOME acumula em "received"
  const byCategory = new Map<string, { spent: number; received: number }>();
  for (const row of totals) {
    const current = byCategory.get(row.categoryId) ?? { spent: 0, received: 0 };
    const amount = Number(row._sum.amount?.toString() ?? "0");
    if (row.type === "EXPENSE") current.spent += amount;
    else current.received += amount;
    byCategory.set(row.categoryId, current);
  }

  return categories.map((c) => {
    const sums = byCategory.get(c.id) ?? { spent: 0, received: 0 };
    // INCOME mostra recebimentos; demais mostram gastos
    const spentThisMonth = c.type === "INCOME" ? sums.received : sums.spent;
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type,
      budget: c.budget ? Number(c.budget.amount.toString()) : null,
      spentThisMonth,
    };
  });
}

// --- mutations ---

export async function createCategory(input: unknown) {
  const userId = await requireUserId();
  const data = categorySchema.parse(input);

  // Evita duplicar nome (constraint @@unique cobre, mas damos mensagem amigável)
  const existing = await prisma.category.findFirst({
    where: { userId, name: data.name },
  });
  if (existing) throw new Error("Já existe uma categoria com esse nome.");

  await prisma.category.create({ data: { userId, ...data } });

  revalidatePath("/main/budget");
  revalidatePath("/main/transactions");
  revalidatePath("/main/monthlyFees");
  revalidatePath("/main/dashboard");
}

export async function updateCategory(id: string, input: unknown) {
  const userId = await requireUserId();
  const data = categorySchema.parse(input);

  const result = await prisma.category.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) throw new Error("Categoria não encontrada");

  revalidatePath("/main/budget");
  revalidatePath("/main/transactions");
  revalidatePath("/main/monthlyFees");
  revalidatePath("/main/dashboard");
}

export async function deleteCategory(id: string) {
  const userId = await requireUserId();

  // Bloqueia exclusão se houver lançamentos/mensalidades usando a categoria
  const [txCount, feeCount] = await Promise.all([
    prisma.transaction.count({ where: { userId, categoryId: id } }),
    prisma.monthlyFees.count({ where: { userId, categoryId: id } }),
  ]);
  if (txCount > 0 || feeCount > 0) {
    throw new Error(
      "Não é possível excluir: existem lançamentos ou mensalidades usando essa categoria.",
    );
  }

  const result = await prisma.category.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Categoria não encontrada");

  revalidatePath("/main/budget");
}
