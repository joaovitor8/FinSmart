"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  LogOut,
  MoreVertical,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { useAuth } from "@/src/contexts/AuthContext";
import { ThemeToggle } from "@/src/components/theme-toggle";

export function MobileHeader() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-lg px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
          <TrendingUp className="h-4 w-4 text-background" />
        </div>
        <h1 className="text-base font-semibold text-foreground">FinSmart</h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle className="h-8 w-8" />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        {/* Menu extra para itens que não cabem na bottom nav (Metas, Configurações, Sair) */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Mais opções"
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href="/main/reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Relatórios</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/main/goals" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span>Metas</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/main/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-rose-400 focus:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
