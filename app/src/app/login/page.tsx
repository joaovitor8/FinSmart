"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao fazer login");
        return;
      }

      toast.success("Login realizado!");
      // Navega e força refresh do RSC para o middleware ler o cookie novo
      router.push("/main/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Faça login para acessar o FinSmart
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 mt-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground mb-1 block">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="bg-secondary/50"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground mb-1 block">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="bg-secondary/50"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-5 w-5" />
            )}
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Ainda não tem uma conta?{" "}
          <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-medium">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
