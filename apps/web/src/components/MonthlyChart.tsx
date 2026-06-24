"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency, formatMonth } from "@/lib/format";

interface MonthlySummary {
  month: string;
  totalIncome: number;
  totalExpenses: number;
}

interface MonthlyChartProps {
  data: MonthlySummary[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = [...data].reverse().map((item) => ({
    month: formatMonth(item.month),
    Ingresos: item.totalIncome,
    Gastos: item.totalExpenses,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
          <XAxis dataKey="month" tick={{ fill: "#6b7280", fontSize: 12 }} />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "#141414",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              color: "#ededed",
            }}
            itemStyle={{ color: "#ededed" }}
            labelStyle={{ color: "#ededed" }}
          />
          <Legend />
          <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
