"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, ShieldAlert, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

import { useAuth } from "@/src/contexts/AuthContext";
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/src/lib/actions/account";
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type DeleteAccountInput,
  type UpdateProfileInput,
} from "@/src/lib/schemas";

export function SettingsView() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-foreground tracking-tight">
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seu perfil, senha e conta
        </p>
      </div>

      <ProfileCard user={user} onUpdated={(u) => setUser({ ...user, ...u })} />
      <PasswordCard />
      <DangerZone
        onDeleted={() => {
          setUser(null);
          router.push("/login");
          router.refresh();
        }}
      />
    </div>
  );
}

// --- Perfil ---

function ProfileCard({
  user,
  onUpdated,
}: {
  user: { name: string | null; email: string };
  onUpdated: (data: { name: string; email: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user.name ?? "", email: user.email },
  });

  function onSubmit(values: UpdateProfileInput) {
    startTransition(async () => {
      try {
        const updated = await updateProfile(values);
        onUpdated(updated);
        reset(updated);
        toast.success("Perfil atualizado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
          <User className="h-4 w-4 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Perfil</h3>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xl">
          {user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            {user.name || "Usuário"}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-foreground">Nome</Label>
          <Input {...register("name")} className="bg-secondary/50" />
          {errors.name && (
            <p className="text-xs text-rose-400">{errors.name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-foreground">Email</Label>
          <Input type="email" {...register("email")} className="bg-secondary/50" />
          {errors.email && (
            <p className="text-xs text-rose-400">{errors.email.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending || !isDirty}
        className="w-full mt-6 bg-emerald-500 text-background hover:bg-emerald-600 font-semibold h-11"
      >
        {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Salvar alterações
      </Button>
    </form>
  );
}

// --- Senha ---

function PasswordCard() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: ChangePasswordInput) {
    startTransition(async () => {
      try {
        await changePassword(values);
        reset();
        toast.success("Senha alterada");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao trocar senha");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10">
          <KeyRound className="h-4 w-4 text-sky-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Trocar senha</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-2">
          <Label className="text-sm text-foreground">Senha atual</Label>
          <Input
            type="password"
            {...register("currentPassword")}
            className="bg-secondary/50"
            autoComplete="current-password"
          />
          {errors.currentPassword && (
            <p className="text-xs text-rose-400">{errors.currentPassword.message}</p>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-foreground">Nova senha</Label>
            <Input
              type="password"
              {...register("newPassword")}
              className="bg-secondary/50"
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <p className="text-xs text-rose-400">{errors.newPassword.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm text-foreground">Confirmar</Label>
            <Input
              type="password"
              {...register("confirmPassword")}
              className="bg-secondary/50"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-400">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="w-full mt-6 bg-sky-500 text-background hover:bg-sky-600 font-semibold h-11"
      >
        {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Atualizar senha
      </Button>
    </form>
  );
}

// --- Zona de perigo ---

function DangerZone({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: "", confirm: "EXCLUIR" as const },
  });

  function onSubmit(values: DeleteAccountInput) {
    startTransition(async () => {
      try {
        await deleteAccount(values);
        toast.success("Conta excluída");
        onDeleted();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir conta");
      }
    });
  }

  return (
    <>
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Zona de perigo</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Excluir a conta apaga permanentemente todas as suas categorias, lançamentos,
          mensalidades, metas e orçamentos. Não tem como desfazer.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            reset();
            setOpen(true);
          }}
          className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
        >
          Excluir minha conta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Excluir conta?</DialogTitle>
              <DialogDescription>
                Esta ação é permanente. Confirme digitando sua senha e a palavra EXCLUIR.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">Sua senha</Label>
              <Input
                type="password"
                {...register("password")}
                className="bg-secondary/50"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-xs text-rose-400">{errors.password.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-sm text-foreground">
                Digite <span className="font-mono text-rose-400">EXCLUIR</span> para confirmar
              </Label>
              <Input
                {...register("confirm")}
                className="bg-secondary/50"
                placeholder="EXCLUIR"
              />
              {errors.confirm && (
                <p className="text-xs text-rose-400">{errors.confirm.message}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
              >
                {pending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar exclusão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
