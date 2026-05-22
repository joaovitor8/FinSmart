"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import { monthlyFeeSchema } from "@/src/lib/schemas";
import { dateInputToUTC } from "@/src/lib/format";
import type { MonthlyFeeDTO } from "@/src/lib/types";

type DbFee = {
  id: string;
  name: string;
  amount: { toString(): string };
  frequency: string;
  date: Date;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: "INCOME" | "EXPENSE" | "BOTH";
  };
};

function toDTO(f: DbFee): MonthlyFeeDTO {
  return {
    id: f.id,
    name: f.name,
    amount: Number(f.amount.toString()),
    category: {
      id: f.category.id,
      name: f.category.name,
      icon: f.category.icon,
      color: f.category.color,
      type: f.category.type,
    },
    frequency: f.frequency,
    date: f.date.toISOString(),
  };
}

// Lista mensalidades do usuário.
export async function listMonthlyFees(): Promise<MonthlyFeeDTO[]> {
  const userId = await requireUserId();
  const fees = await prisma.monthlyFees.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    include: { category: true },
  });
  return fees.map(toDTO);
}

// Cria uma mensalidade.
export async function createMonthlyFee(input: unknown) {
  const userId = await requireUserId();
  const data = monthlyFeeSchema.parse(input);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new Error("Categoria inválida");

  await prisma.monthlyFees.create({
    data: {
      userId,
      name: data.name,
      amount: data.amount,
      categoryId: data.categoryId,
      frequency: data.frequency,
      date: dateInputToUTC(data.date),
    },
  });

  revalidatePath("/main/monthlyFees");
  revalidatePath("/main/dashboard");
}

// Atualiza uma mensalidade.
export async function updateMonthlyFee(id: string, input: unknown) {
  const userId = await requireUserId();
  const data = monthlyFeeSchema.parse(input);

  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) throw new Error("Categoria inválida");

  const result = await prisma.monthlyFees.updateMany({
    where: { id, userId },
    data: {
      name: data.name,
      amount: data.amount,
      categoryId: data.categoryId,
      frequency: data.frequency,
      date: dateInputToUTC(data.date),
    },
  });
  if (result.count === 0) throw new Error("Mensalidade não encontrada");

  revalidatePath("/main/monthlyFees");
  revalidatePath("/main/dashboard");
}

// Remove uma mensalidade.
export async function deleteMonthlyFee(id: string) {
  const userId = await requireUserId();

  const result = await prisma.monthlyFees.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Mensalidade não encontrada");

  revalidatePath("/main/monthlyFees");
  revalidatePath("/main/dashboard");
}
