"use client";

import { CATEGORY_LABELS } from "@finanzas/shared";
import { formatCurrency, formatDate } from "@/lib/format";
import { TransactionCategory } from "@finanzas/shared";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string | null;
}

interface TransactionsListProps {
  transactions: Transaction[];
  total: number;
  onLoadMore?: () => void;
  hasMore: boolean;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const FILTER_CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  ...Object.entries(CATEGORY_LABELS)
    .filter(([key]) => key !== "income")
    .map(([value, label]) => ({ value, label })),
];

export function TransactionsList({
  transactions,
  total,
  onLoadMore,
  hasMore,
  selectedCategory,
  onCategoryChange,
}: TransactionsListProps) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Transacciones</h3>
        <span className="text-sm text-[var(--muted)]">{total} total</span>
      </div>

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedCategory === cat.value
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--card-border)]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{tx.description}</p>
              <div className="flex gap-2 text-xs text-[var(--muted)]">
                <span>{formatDate(tx.date)}</span>
                <span>•</span>
                <span className="rounded bg-[var(--card-border)] px-1.5 py-0.5">
                  {CATEGORY_LABELS[tx.category as keyof typeof CATEGORY_LABELS] || tx.category}
                </span>
                {tx.subcategory && (
                  <>
                    <span>•</span>
                    <span>{tx.subcategory}</span>
                  </>
                )}
              </div>
            </div>
            <p
              className={`font-mono text-sm font-medium ${
                tx.amount < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
              }`}
            >
              {tx.amount < 0 ? "-" : "+"}
              {formatCurrency(Math.abs(tx.amount))}
            </p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={onLoadMore}
          className="mt-4 w-full rounded-lg border border-[var(--card-border)] py-2 text-sm text-[var(--muted)] hover:bg-[var(--card-border)]"
        >
          Cargar más
        </button>
      )}
    </div>
  );
}
