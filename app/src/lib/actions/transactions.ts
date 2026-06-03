"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { rateLimit } from "@/src/lib/ratelimit";
import { transactionImportSchema, transactionSchema } from "@/src/lib/schemas";
import { dateInputToUTC } from "@/src/lib/format";
import type { TransactionDTO } from "@/src/lib/types";

type DbTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: { toString(): string };
  description: string;
  date: Date;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: "INCOME" | "EXPENSE" | "BOTH";
  };
};

function toDTO(t: DbTransaction): TransactionDTO {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount.toString()),
    description: t.description,
    category: {
      id: t.category.id,
      name: t.category.name,
      icon: t.category.icon,
      color: t.category.color,
      type: t.category.type,
    },
    date: t.date.toISOString(),
  };
}

// Lista as transações do usuário (mais recente primeiro).
export async function listTransactions(): Promise<TransactionDTO[]> {
  const userId = await requireUserId();
  const items = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });
  return items.map(toDTO);
}

// Cria uma transação.
export async function createTransaction(input: unknown) {
  const userId = await requireUserId();

  // Anti-flood: limita criação por usuário (não impede uso normal, mas barra bots)
  const limit = await rateLimit(`tx-create:${userId}`, 30, 60_000);
  if (!limit.success) {
    throw new Error(`Muitas operações. Tente novamente em ${limit.retryAfterSeconds}s.`);
  }

  const data = transactionSchema.parse(input);

  // Garante que a categoria pertence ao usuário
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new Error("Categoria inválida");

  await prisma.transaction.create({
    data: {
      userId,
      type: data.type,
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      date: dateInputToUTC(data.date),
    },
  });

  revalidatePath("/main/transactions");
  revalidatePath("/main/dashboard");
  revalidatePath("/main/budget");
}

// Atualiza uma transação.
export async function updateTransaction(id: string, input: unknown) {
  const userId = await requireUserId();
  const data = transactionSchema.parse(input);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new Error("Categoria inválida");

  const result = await prisma.transaction.updateMany({
    where: { id, userId },
    data: {
      type: data.type,
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      date: dateInputToUTC(data.date),
    },
  });
  if (result.count === 0) throw new Error("Transação não encontrada");

  revalidatePath("/main/transactions");
  revalidatePath("/main/dashboard");
  revalidatePath("/main/budget");
}

// Importa em lote (CSV de extrato). Valida tudo, confere donos das categorias, insere em createMany.
export async function importTransactions(input: unknown): Promise<{ imported: number }> {
  const userId = await requireUserId();

  // Anti-abuso: cada chamada pode inserir até 1000 linhas; 3/min = teto de
  // 3000 linhas/min por usuário, suficiente pra importar vários extratos
  // grandes seguidos sem virar vetor de DoS de DB.
  const limit = await rateLimit(`tx-import:${userId}`, 3, 60_000);
  if (!limit.success) {
    throw new Error(
      `Limite de importações atingido. Tente novamente em ${limit.retryAfterSeconds}s.`,
    );
  }

  const data = transactionImportSchema.parse(input);

  // Coleta os categoryIds únicos e valida todos de uma vez
  const uniqueCategoryIds = Array.from(new Set(data.items.map((i) => i.categoryId)));
  const owned = await prisma.category.findMany({
    where: { id: { in: uniqueCategoryIds }, userId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((c) => c.id));
  const invalid = uniqueCategoryIds.filter((id) => !ownedSet.has(id));
  if (invalid.length > 0) {
    throw new Error("Uma ou mais categorias inválidas");
  }

  const result = await prisma.transaction.createMany({
    data: data.items.map((i) => ({
      userId,
      type: i.type,
      amount: i.amount,
      description: i.description,
      categoryId: i.categoryId,
      date: dateInputToUTC(i.date),
    })),
  });

  revalidatePath("/main/transactions");
  revalidatePath("/main/dashboard");
  revalidatePath("/main/budget");
  revalidatePath("/main/reports");
  return { imported: result.count };
}

// Remove uma transação.
export async function deleteTransaction(id: string) {
  const userId = await requireUserId();

  const result = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Transação não encontrada");

  revalidatePath("/main/transactions");
  revalidatePath("/main/dashboard");
  revalidatePath("/main/budget");
}
