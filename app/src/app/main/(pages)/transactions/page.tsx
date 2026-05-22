import { AppShell } from "@/src/components/app-shell";
import { TransactionsView } from "@/src/components/transactions/transactionsView";
import { listTransactions } from "@/src/lib/actions/transactions";
import { listCategories } from "@/src/lib/actions/categories";

export default async function TransactionsPage() {
  const [transactions, categories] = await Promise.all([
    listTransactions(),
    listCategories(),
  ]);

  return (
    <AppShell>
      <TransactionsView transactions={transactions} categories={categories} />
    </AppShell>
  );
}
