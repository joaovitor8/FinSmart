import { AppShell } from "@/src/components/app-shell";
import { DashboardView } from "@/src/components/dashboard/dashboardView";

export default async function DashboardPage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
