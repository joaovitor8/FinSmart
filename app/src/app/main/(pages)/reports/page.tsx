import { AppShell } from "@/src/components/app-shell";
import { ReportsView } from "@/src/components/reports/reportsView";
import { getReportsData } from "@/src/lib/actions/reports";

type Props = {
  searchParams: Promise<{ months?: string }>;
};

// Página de relatórios: lê ?months=N (default 6) e busca os dados no server.
export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const months = Number(params.months ?? 6);
  const safeMonths = Number.isFinite(months) && months > 0 ? months : 6;
  const data = await getReportsData(safeMonths);

  return (
    <AppShell>
      <ReportsView data={data} />
    </AppShell>
  );
}
