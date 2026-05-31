"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <p className="text-sm text-rose-400 text-center">
        Link inválido. Solicite um novo em{" "}
        <Link href="/forgot-password" className="underline">
          esqueci minha senha
        </Link>
        .
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao redefinir senha");
        return;
      }
      toast.success("Senha redefinida. Faça login com a nova senha.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-8">
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          Nova senha
        </label>
        <Input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="bg-secondary/50"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">
          Confirmar
        </label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Digite de novo"
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
          <KeyRound className="mr-2 h-5 w-5" />
        )}
        Redefinir senha
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Nova senha
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Escolha uma senha forte que você não usa em outros sites.
          </p>
        </div>
        <Suspense fallback={<Loader2 className="h-5 w-5 animate-spin mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
