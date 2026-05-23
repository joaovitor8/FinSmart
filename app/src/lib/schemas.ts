// Schemas Zod compartilhados entre client (RHF) e server (validação de actions).
import { z } from "zod";

// --- Auth ---
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("Email inválido").max(255, "Email muito longo"),
  // bcrypt trunca silenciosamente em 72 bytes; capar previne ambiguidade
  password: z
    .string()
    .min(8, "Senha precisa ter no mínimo 8 caracteres")
    .max(72, "Senha muito longa (máx. 72 caracteres)"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido").max(255, "Email muito longo"),
  password: z.string().min(1, "Senha obrigatória").max(200, "Senha muito longa"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("Email inválido").max(255, "Email muito longo"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual obrigatória").max(200, "Senha muito longa"),
    newPassword: z
      .string()
      .min(8, "Senha precisa ter no mínimo 8 caracteres")
      .max(72, "Senha muito longa (máx. 72 caracteres)"),
    confirmPassword: z.string().max(72),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Confirmação não confere",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Senha obrigatória").max(200, "Senha muito longa"),
  confirm: z.literal("EXCLUIR", { errorMap: () => ({ message: "Digite EXCLUIR para confirmar" }) }),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

// --- Goals ---
export const goalIconEnum = z.enum(["target", "plane", "car", "home", "shield"]);
export const goalColorEnum = z.enum(["emerald", "blue", "amber", "purple"]);

export const goalCreateSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(50, "Nome muito longo"),
  target: z.coerce.number().positive("Valor precisa ser positivo"),
  icon: goalIconEnum.default("target"),
  color: goalColorEnum.default("emerald"),
});
export type GoalCreateInput = z.infer<typeof goalCreateSchema>;

export const goalUpdateSchema = goalCreateSchema;
export type GoalUpdateInput = z.infer<typeof goalUpdateSchema>;

export const goalProgressSchema = z.object({
  amount: z.coerce.number().positive("Valor precisa ser positivo"),
});

// --- Categorias ---
export const categoryTypeEnum = z.enum(["INCOME", "EXPENSE", "BOTH"]);
export type CategoryTypeEnum = z.infer<typeof categoryTypeEnum>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(30, "Nome muito longo"),
  icon: z.string().min(1, "Ícone obrigatório").max(50, "Ícone inválido"),
  color: z.string().min(1, "Cor obrigatória").max(30, "Cor inválida"),
  type: categoryTypeEnum.default("EXPENSE"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

// --- Orçamento (Budget) ---
export const budgetSchema = z.object({
  categoryId: z.string().uuid("Categoria inválida"),
  amount: z.coerce.number().positive("Valor precisa ser positivo"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

// --- Mensalidades ---
export const monthlyFeeFrequencyEnum = z.enum(["Mensal", "Anual"]);

export const monthlyFeeSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(60, "Nome muito longo"),
  amount: z.coerce.number().positive("Valor precisa ser positivo"),
  categoryId: z.string().uuid("Categoria inválida"),
  frequency: monthlyFeeFrequencyEnum,
  date: z.string().min(1, "Data obrigatória").max(30, "Data inválida"),
});
export type MonthlyFeeInput = z.infer<typeof monthlyFeeSchema>;

// --- Transações ---
export const transactionTypeEnum = z.enum(["INCOME", "EXPENSE"]);

export const transactionSchema = z.object({
  type: transactionTypeEnum,
  amount: z.coerce.number().positive("Valor precisa ser positivo"),
  description: z.string().trim().min(1, "Descrição obrigatória").max(200, "Descrição muito longa"),
  categoryId: z.string().uuid("Categoria inválida"),
  date: z.string().min(1, "Data obrigatória").max(30, "Data inválida"),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

// Bulk import (importação de extrato CSV)
export const transactionImportSchema = z.object({
  items: z
    .array(transactionSchema)
    .min(1, "Nenhum lançamento para importar")
    .max(1000, "Importação muito grande (máx. 1000 lançamentos)"),
});
export type TransactionImportInput = z.infer<typeof transactionImportSchema>;

// --- Mentor IA ---
export const mentorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000, "Mensagem muito longa"),
});
export type MentorMessageInput = z.infer<typeof mentorMessageSchema>;

export const askMentorSchema = z.object({
  history: z.array(mentorMessageSchema).max(20, "Histórico muito longo"),
  userMessage: z.string().trim().min(1, "Pergunta obrigatória").max(2000, "Pergunta muito longa"),
});
export type AskMentorInput = z.infer<typeof askMentorSchema>;
