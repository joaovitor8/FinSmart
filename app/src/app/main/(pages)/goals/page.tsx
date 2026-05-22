// Server Component: busca as metas e entrega ao componente client.
import { AppShell } from "@/src/components/app-shell";
import { GoalsView } from "@/src/components/goals/goalsView";
import { listGoals } from "@/src/lib/actions/goals";

export default async function GoalsPage() {
  const goals = await listGoals();

  return (
    <AppShell>
      <GoalsView goals={goals} />
    </AppShell>
  );
}
