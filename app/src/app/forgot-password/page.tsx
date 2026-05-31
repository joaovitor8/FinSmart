"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Erro ao processar pedido");
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Esqueci minha senha
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {sent
              ? "Pronto. Se o email estiver cadastrado, você vai receber um link em alguns segundos."
              : "Digite seu email e enviaremos um link para redefinir a senha."}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
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
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Mail className="mr-2 h-5 w-5" />
              )}
              Enviar link
            </Button>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Não recebeu? Confira a pasta de spam. O link expira em 1 hora.
          </p>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link
            href="/login"
            className="text-emerald-500 hover:text-emerald-400 font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  );
}
