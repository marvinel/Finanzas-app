"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { CATEGORY_LABELS } from "@finanzas/shared";
import { formatCurrency } from "@/lib/format";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48",
];

interface SpendingChartProps {
  data: { category: string; total: number; percentage: number }[];
}

export function SpendingChart({ data }: SpendingChartProps) {
  const chartData = data.map((item) => ({
    name: CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] || item.category,
    value: item.total,
    percentage: item.percentage,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
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
          <Legend
            formatter={(value) => (
              <span className="text-xs text-[var(--foreground)]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
