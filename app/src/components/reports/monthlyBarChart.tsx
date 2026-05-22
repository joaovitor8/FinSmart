"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "@/src/lib/format";
import type { MonthlyPoint } from "@/src/lib/actions/reports";

// Comparativo mensal de entradas vs saídas (barras lado a lado)
export function MonthlyBarChart({ data }: { data: MonthlyPoint[] }) {
  if (data.every((d) => d.income === 0 && d.expense === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Sem lançamentos no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
          formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
          cursor={{ fill: "hsl(0 0% 100% / 0.04)" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="income" name="Entradas" fill="#34d399" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Saídas" fill="#fb7185" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
