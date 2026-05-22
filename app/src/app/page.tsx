"use client";

import Link from "next/link";
import { Bot, TrendingUp, Wallet } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-zinc-950" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              FinSmart <span className="text-emerald-500">AI</span>
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {!user ? (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-zinc-300 hover:text-white hover:bg-zinc-800"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                    Começar Grátis
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/main/dashboard">
                <Button
                  variant="ghost"
                  className="text-emerald-500 hover:text-emerald-400 hover:bg-zinc-800 font-medium"
                >
                  Meu Dashboard
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center justify-center gap-8 py-20 px-4 text-center md:py-32">
          <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
            Controle financeiro pessoal, simples e direto
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
            Saiba para onde seu <br className="hidden md:block" />
            <span className="bg-linear-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              dinheiro está indo
            </span>
          </h1>

          <p className="max-w-2xl leading-normal text-zinc-400 sm:text-xl sm:leading-8">
            Registre entradas e saídas, acompanhe assinaturas e veja seu progresso em
            metas — tudo em um lugar só, sem planilha.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            {!user ? (
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-lg h-12 px-8"
                >
                  Criar Conta Grátis
                </Button>
              </Link>
            ) : (
              <Link href="/main/dashboard">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-lg h-12 px-8"
                >
                  Ir para Dashboard
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="container mx-auto py-20 px-4" id="features">
          <div className="grid gap-8 md:grid-cols-3">
            <Feature
              icon={<Wallet className="h-6 w-6 text-emerald-500" />}
              title="Lançamentos rápidos"
              text="Registre receitas e despesas em segundos. Filtre por mês, busque por descrição e veja seu saldo em tempo real."
            />
            <Feature
              icon={<TrendingUp className="h-6 w-6 text-emerald-500" />}
              title="Assinaturas e contas fixas"
              text="Centralize Netflix, Spotify, internet, aluguel — descubra quanto sai automaticamente todo mês."
            />
            <Feature
              icon={<Bot className="h-6 w-6 text-emerald-500" />}
              title="Metas que se cumprem"
              text="Defina um alvo, vá juntando aos poucos e acompanhe o progresso com gráficos claros."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-zinc-500">
            © 2026 FinSmart. Desenvolvido para portfólio.
          </p>
          <div className="flex gap-4">
            <a
              href="https://github.com/joaovitor8"
              target="_blank"
              className="text-sm text-zinc-500 hover:text-emerald-500"
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/joaovitorezequiel/"
              target="_blank"
              className="text-sm text-zinc-500 hover:text-emerald-500"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-emerald-500/50 transition-colors duration-300">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold text-white">{title}</h3>
      <p className="text-zinc-400">{text}</p>
    </div>
  );
}
