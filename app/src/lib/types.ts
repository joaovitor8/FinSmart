// DTOs serializáveis (Decimal vira number no client).

export type CategoryDTO = {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "INCOME" | "EXPENSE" | "BOTH";
};

export type BudgetDTO = {
  id: string;
  categoryId: string;
  amount: number;
};

// Categoria + budget (opcional) + gasto no mês corrente (para a página de orçamento)
export type CategoryWithBudgetDTO = CategoryDTO & {
  budget: number | null;
  spentThisMonth: number;
};

export type GoalDTO = {
  id: string;
  name: string;
  target: number;
  current: number;
  icon: string;
  color: string;
};

export type MonthlyFeeDTO = {
  id: string;
  name: string;
  amount: number;
  category: CategoryDTO;
  frequency: string;
  date: string; // ISO
};

export type TransactionDTO = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  category: CategoryDTO;
  date: string; // ISO
};
