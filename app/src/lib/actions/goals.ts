"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/src/lib/prisma";
import { requireUserId } from "@/src/lib/auth-server";
import {
  goalCreateSchema,
  goalUpdateSchema,
  goalProgressSchema,
} from "@/src/lib/schemas";
import type { GoalDTO } from "@/src/lib/types";

// Converte o registro do Prisma (Decimal) para DTO serializável.
function toDTO(g: {
  id: string;
  name: string;
  target: { toString(): string };
  current: { toString(): string };
  icon: string;
  color: string;
}): GoalDTO {
  return {
    id: g.id,
    name: g.name,
    target: Number(g.target.toString()),
    current: Number(g.current.toString()),
    icon: g.icon,
    color: g.color,
  };
}

// Lista as metas do usuário logado.
export async function listGoals(): Promise<GoalDTO[]> {
  const userId = await requireUserId();
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return goals.map(toDTO);
}

// Cria uma meta.
export async function createGoal(input: unknown) {
  const userId = await requireUserId();
  const data = goalCreateSchema.parse(input);

  await prisma.goal.create({
    data: { userId, ...data },
  });

  revalidatePath("/main/goals");
  revalidatePath("/main/dashboard");
}

// Atualiza dados gerais da meta (nome, alvo, ícone, cor).
export async function updateGoal(id: string, input: unknown) {
  const userId = await requireUserId();
  const data = goalUpdateSchema.parse(input);

  const result = await prisma.goal.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) throw new Error("Meta não encontrada");

  revalidatePath("/main/goals");
  revalidatePath("/main/dashboard");
}

// Soma um valor ao "current" (progresso da meta).
export async function addToGoalProgress(id: string, input: unknown) {
  const userId = await requireUserId();
  const { amount } = goalProgressSchema.parse(input);

  // Lê para validar dono e calcular novo valor sem ultrapassar target absurdamente
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error("Meta não encontrada");

  const newCurrent = Number(goal.current.toString()) + amount;

  await prisma.goal.update({
    where: { id: goal.id },
    data: { current: newCurrent },
  });

  revalidatePath("/main/goals");
  revalidatePath("/main/dashboard");
}

// Remove a meta.
export async function deleteGoal(id: string) {
  const userId = await requireUserId();

  const result = await prisma.goal.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Meta não encontrada");

  revalidatePath("/main/goals");
  revalidatePath("/main/dashboard");
}
