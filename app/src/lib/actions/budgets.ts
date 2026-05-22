"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { budgetSchema } from "@/src/lib/schemas";

// Cria ou atualiza o budget de uma categoria.
export async function upsertBudget(input: unknown) {
  const userId = await requireUserId();
  const data = budgetSchema.parse(input);

  // Confirma que a categoria pertence ao usuário
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new Error("Categoria não encontrada");

  await prisma.budget.upsert({
    where: { categoryId: data.categoryId },
    create: { userId, categoryId: data.categoryId, amount: data.amount },
    update: { amount: data.amount },
  });

  revalidatePath("/main/budget");
  revalidatePath("/main/dashboard");
}

// Remove o budget de uma categoria.
export async function deleteBudget(categoryId: string) {
  const userId = await requireUserId();

  const result = await prisma.budget.deleteMany({
    where: { categoryId, userId },
  });
  if (result.count === 0) throw new Error("Orçamento não encontrado");

  revalidatePath("/main/budget");
  revalidatePath("/main/dashboard");
}
