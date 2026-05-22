import { AppShell } from "@/src/components/app-shell";
import { MonthlyFeesView } from "@/src/components/monthlyFees/monthlyFeesView";
import { listMonthlyFees } from "@/src/lib/actions/monthlyFees";
import { listCategories } from "@/src/lib/actions/categories";

export default async function MonthlyFeesPage() {
  const [fees, categories] = await Promise.all([
    listMonthlyFees(),
    listCategories(),
  ]);

  return (
    <AppShell>
      <MonthlyFeesView fees={fees} categories={categories} />
    </AppShell>
  );
}
