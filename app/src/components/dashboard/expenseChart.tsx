"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { categoryColorMap } from "@/src/lib/constants";
import { formatCurrency } from "@/src/lib/format";

type ChartItem = {
  categoryId: string;
  name: string;
  color: string;
  total: number;
};

type Props = {
  data: ChartItem[];
};

function colorHex(color: string): string {
  return categoryColorMap[color]?.hex ?? "#a1a1aa";
}

export function ExpenseChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-50 text-sm text-muted-foreground">
        Sem gastos registrados neste mês
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell key={entry.categoryId} fill={colorHex(entry.color)} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(0 0% 9%)",
            border: "1px solid hsl(0 0% 15%)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ExpenseChartLegend({ data }: Props) {
  if (data.length === 0) return null;
  const total = data.reduce((acc, d) => acc + d.total, 0);

  return (
    <ul className="flex flex-col gap-2 mt-4">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.total / total) * 100) : 0;
        return (
          <li key={d.categoryId} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colorHex(d.color) }}
              />
              <span className="text-foreground">{d.name}</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-muted-foreground">{pct}%</span>
              <span className="text-foreground">{formatCurrency(d.total)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
