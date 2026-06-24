"use client";

import { CATEGORY_LABELS } from "@finanzas/shared";
import { formatCurrency, formatDate } from "@/lib/format";

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
}

export function TransactionsList({
  transactions,
  total,
  onLoadMore,
  hasMore,
}: TransactionsListProps) {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Transacciones</h3>
        <span className="text-sm text-[var(--muted)]">{total} total</span>
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
