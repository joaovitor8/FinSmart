// Constantes compartilhadas: paletas de cores, ícones e listas auxiliares.
import {
  Bus,
  Building,
  Car,
  CircleDollarSign,
  Coffee,
  Dumbbell,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Package,
  PiggyBank,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  Sparkles,
  Target,
  Tv,
  Utensils,
  Wallet,
  Wifi,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

// --- Metas ---
export const goalIcons: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "target", label: "Objetivo", icon: Target },
  { value: "plane", label: "Viagem", icon: Plane },
  { value: "car", label: "Carro", icon: Car },
  { value: "home", label: "Casa", icon: Home },
  { value: "shield", label: "Reserva", icon: Shield },
];

export const goalIconMap: Record<string, LucideIcon> = Object.fromEntries(
  goalIcons.map((i) => [i.value, i.icon]),
);

export const goalColors = [
  { value: "emerald", bg: "bg-emerald-500", ring: "ring-emerald-500" },
  { value: "blue", bg: "bg-sky-500", ring: "ring-sky-500" },
  { value: "amber", bg: "bg-amber-500", ring: "ring-amber-500" },
  { value: "purple", bg: "bg-purple-500", ring: "ring-purple-500" },
] as const;

export const goalColorClasses: Record<
  string,
  { bg: string; text: string; progress: string; border: string }
> = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    progress: "[&>div]:bg-emerald-500",
    border: "hover:border-emerald-500/30",
  },
  blue: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    progress: "[&>div]:bg-sky-500",
    border: "hover:border-sky-500/30",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    progress: "[&>div]:bg-amber-500",
    border: "hover:border-amber-500/30",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    progress: "[&>div]:bg-purple-500",
    border: "hover:border-purple-500/30",
  },
};

// --- Categorias (dinâmicas via banco). Aqui ficam só catálogos de ícones/cores. ---

// Catálogo de ícones disponíveis para o usuário escolher ao criar categoria
export const categoryIconCatalog: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "utensils", label: "Alimentação", icon: Utensils },
  { value: "bus", label: "Transporte", icon: Bus },
  { value: "gamepad", label: "Lazer", icon: Gamepad2 },
  { value: "heart-pulse", label: "Saúde", icon: HeartPulse },
  { value: "graduation-cap", label: "Educação", icon: GraduationCap },
  { value: "building", label: "Moradia", icon: Building },
  { value: "wifi", label: "Internet", icon: Wifi },
  { value: "tv", label: "Streaming", icon: Tv },
  { value: "dumbbell", label: "Academia", icon: Dumbbell },
  { value: "shield", label: "Seguro", icon: Shield },
  { value: "coffee", label: "Cafezinho", icon: Coffee },
  { value: "shopping-bag", label: "Compras", icon: ShoppingBag },
  { value: "wallet", label: "Salário", icon: Wallet },
  { value: "trending-up", label: "Investimento", icon: TrendingUp },
  { value: "circle-dollar-sign", label: "Renda extra", icon: CircleDollarSign },
  { value: "landmark", label: "Banco", icon: Landmark },
  { value: "piggy-bank", label: "Poupança", icon: PiggyBank },
  { value: "receipt", label: "Conta", icon: Receipt },
  { value: "sparkles", label: "Outros", icon: Sparkles },
  { value: "package", label: "Outros 2", icon: Package },
];

export const categoryIconMap: Record<string, LucideIcon> = Object.fromEntries(
  categoryIconCatalog.map((i) => [i.value, i.icon]),
);

// Paleta usada para categorias
export const categoryColorOptions = [
  "emerald",
  "sky",
  "amber",
  "purple",
  "rose",
  "orange",
  "teal",
  "blue",
  "zinc",
] as const;

export type CategoryColor = (typeof categoryColorOptions)[number];

// Classes Tailwind por cor (badge: bg + text, swatch: bg sólido, hex p/ recharts)
export const categoryColorMap: Record<
  string,
  { badge: string; swatch: string; hex: string; text: string }
> = {
  emerald: {
    badge: "bg-emerald-500/10 text-emerald-400",
    swatch: "bg-emerald-500",
    hex: "#34d399",
    text: "text-emerald-400",
  },
  sky: {
    badge: "bg-sky-500/10 text-sky-400",
    swatch: "bg-sky-500",
    hex: "#38bdf8",
    text: "text-sky-400",
  },
  amber: {
    badge: "bg-amber-500/10 text-amber-400",
    swatch: "bg-amber-500",
    hex: "#fbbf24",
    text: "text-amber-400",
  },
  purple: {
    badge: "bg-purple-500/10 text-purple-400",
    swatch: "bg-purple-500",
    hex: "#a78bfa",
    text: "text-purple-400",
  },
  rose: {
    badge: "bg-rose-500/10 text-rose-400",
    swatch: "bg-rose-500",
    hex: "#fb7185",
    text: "text-rose-400",
  },
  orange: {
    badge: "bg-orange-500/10 text-orange-400",
    swatch: "bg-orange-500",
    hex: "#fb923c",
    text: "text-orange-400",
  },
  teal: {
    badge: "bg-teal-500/10 text-teal-400",
    swatch: "bg-teal-500",
    hex: "#2dd4bf",
    text: "text-teal-400",
  },
  blue: {
    badge: "bg-blue-500/10 text-blue-400",
    swatch: "bg-blue-500",
    hex: "#60a5fa",
    text: "text-blue-400",
  },
  zinc: {
    badge: "bg-secondary text-muted-foreground",
    swatch: "bg-zinc-500",
    hex: "#a1a1aa",
    text: "text-muted-foreground",
  },
};

// Fallback seguro: cor desconhecida vira zinc.
export function getCategoryColors(color: string) {
  return categoryColorMap[color] ?? categoryColorMap.zinc;
}
