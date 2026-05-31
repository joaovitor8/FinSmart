// Layout do app autenticado. Faz a validação completa da sessão (JWT +
// não-revogada no DB). O middleware /proxy só checa assinatura (Edge runtime
// não tem Prisma); essa segunda camada é o que torna a revogação imediata.
import { redirect } from "next/navigation";
import { getSession } from "@/src/lib/auth-server";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <>{children}</>;
}
