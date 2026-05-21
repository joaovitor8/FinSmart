// Categorias padrão criadas para todo novo usuário no momento do registro.
import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/src/lib/prisma";

type SeedCategory = {
  name: string;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
};

// Aceita o client padrão ou um tx de $transaction
type DbClient = PrismaClient | Prisma.TransactionClient;

const DEFAULT_CATEGORIES: SeedCategory[] = [
  // Saídas comuns
  { name: "Alimentação", icon: "utensils", color: "orange", type: "EXPENSE" },
  { name: "Transporte", icon: "bus", color: "sky", type: "EXPENSE" },
  { name: "Moradia", icon: "building", color: "amber", type: "EXPENSE" },
  { name: "Saúde", icon: "heart-pulse", color: "rose", type: "EXPENSE" },
  { name: "Educação", icon: "graduation-cap", color: "blue", type: "EXPENSE" },
  { name: "Lazer", icon: "gamepad", color: "purple", type: "EXPENSE" },
  { name: "Compras", icon: "shopping-bag", color: "rose", type: "EXPENSE" },
  // Assinaturas / fixos
  { name: "Streaming", icon: "tv", color: "purple", type: "EXPENSE" },
  { name: "Internet", icon: "wifi", color: "sky", type: "EXPENSE" },
  { name: "Academia", icon: "dumbbell", color: "rose", type: "EXPENSE" },
  // Entradas
  { name: "Salário", icon: "wallet", color: "emerald", type: "INCOME" },
  { name: "Investimento", icon: "trending-up", color: "teal", type: "INCOME" },
  { name: "Renda extra", icon: "circle-dollar-sign", color: "emerald", type: "INCOME" },
  // Curinga
  { name: "Outros", icon: "sparkles", color: "zinc", type: "BOTH" },
];

// Cria as categorias padrão para um usuário recém-criado.
// Recebe opcionalmente um tx de transação para rodar atomicamente com o create do user.
export async function seedDefaultCategories(userId: string, db: DbClient = prisma) {
  await db.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ userId, ...c })),
    skipDuplicates: true,
  });
}
