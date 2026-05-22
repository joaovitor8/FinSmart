import { AppShell } from "@/src/components/app-shell";
import { BudgetView } from "@/src/components/categories/budgetView";
import { listCategoriesWithBudget } from "@/src/lib/actions/categories";

export default async function BudgetPage() {
  const categories = await listCategoriesWithBudget();

  return (
    <AppShell>
      <BudgetView categories={categories} />
    </AppShell>
  );
}
