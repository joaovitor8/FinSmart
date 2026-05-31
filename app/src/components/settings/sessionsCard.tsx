"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Monitor, Smartphone, ShieldCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import {
  listSessions,
  revokeSession,
  revokeOtherSessions,
} from "@/src/lib/actions/sessions";
import type { SessionDTO } from "@/src/lib/sessions";

export function SessionsCard() {
  const [sessions, setSessions] = useState<SessionDTO[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmAll, setConfirmAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Carrega lista
  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch(() => toast.error("Erro ao carregar sessões"));
  }, []);

  function reload() {
    listSessions().then(setSessions).catch(() => undefined);
  }

  function handleRevoke(id: string) {
    setRevokingId(id);
    startTransition(async () => {
      try {
        await revokeSession(id);
        toast.success("Sessão encerrada");
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao encerrar sessão");
      } finally {
        setRevokingId(null);
      }
    });
  }

  function handleRevokeAll() {
    setConfirmAll(false);
    startTransition(async () => {
      try {
        const { revoked } = await revokeOtherSessions();
        toast.success(
          revoked === 0
            ? "Nenhuma outra sessão ativa"
            : `${revoked} sessão(ões) encerrada(s)`,
        );
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao encerrar sessões");
      }
    });
  }

  const otherSessionsCount = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Sessões ativas</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Esses são os dispositivos onde sua conta está logada. Se reconhecer algo
        estranho, encerre a sessão e troque sua senha.
      </p>

      {sessions === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">Nenhuma sessão ativa.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionRow
              key={s.id}
              session={s}
              onRevoke={() => handleRevoke(s.id)}
              loading={revokingId === s.id && pending}
            />
          ))}
        </ul>
      )}

      {otherSessionsCount > 0 && (
        <Button
          variant="outline"
          onClick={() => setConfirmAll(true)}
          disabled={pending}
          className="w-full mt-4 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Encerrar todas as outras sessões
        </Button>
      )}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Encerrar outras sessões?"
        description={`${otherSessionsCount} outra(s) sessão(ões) será(ão) deslogada(s) imediatamente. Sua sessão atual continua ativa.`}
        confirmLabel="Encerrar"
        destructive
        onConfirm={handleRevokeAll}
      />
    </div>
  );
}

// --- Linha individual ---

function SessionRow({
  session,
  onRevoke,
  loading,
}: {
  session: SessionDTO;
  onRevoke: () => void;
  loading: boolean;
}) {
  const device = parseDevice(session.userAgent);
  const Icon = device.kind === "mobile" ? Smartphone : Monitor;

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">
            {device.label}
          </p>
          {session.current && (
            <span className="text-[10px] font-semibold uppercase tracking-wide rounded bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5">
              Esta sessão
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {session.ip ?? "IP desconhecido"} ·{" "}
          {formatDistanceToNow(new Date(session.lastUsedAt), {
            locale: ptBR,
            addSuffix: true,
          })}
        </p>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRevoke}
          disabled={loading}
          className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Encerrar"
          )}
        </Button>
      )}
    </li>
  );
}

// --- Parsing leve de user-agent ---

type Device = { kind: "desktop" | "mobile"; label: string };

function parseDevice(ua: string | null): Device {
  if (!ua) return { kind: "desktop", label: "Dispositivo desconhecido" };

  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";

  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Desconhecido";

  return {
    kind: isMobile ? "mobile" : "desktop",
    label: `${browser} · ${os}`,
  };
}
