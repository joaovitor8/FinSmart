"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/src/lib/format";
import type { MonthlyPoint } from "@/src/lib/actions/reports";

// Evolução do saldo mensal (receita - despesa)
export function BalanceLineChart({ data }: { data: MonthlyPoint[] }) {
  if (data.every((d) => d.balance === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sem saldo registrado no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 18%)" vertical={false} />
        <XAxis
          dataKey="monthLabel"
          stroke="hsl(0 0% 60%)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(0 0% 60%)"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `R$ ${Math.round(Number(v) / 1000)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(0 0% 9%)",
            border: "1px solid hsl(0 0% 15%)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Saldo"]}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#38bdf8"
          strokeWidth={2}
          fill="url(#balanceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
