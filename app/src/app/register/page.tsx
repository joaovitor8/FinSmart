"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao criar conta");
        return;
      }

      toast.success("Conta criada! Faça login para continuar.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Criar Conta</h2>
          <p className="text-sm text-muted-foreground mt-2">Junte-se ao FinSmart hoje</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6 mt-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground mb-1 block">
                Nome
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Como quer ser chamado?"
                className="bg-secondary/50"
              />
            </div>
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
                placeholder="No mínimo 8 caracteres"
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
              <UserPlus className="mr-2 h-5 w-5" />
            )}
            Cadastrar
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-emerald-500 hover:text-emerald-400 font-medium">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}
