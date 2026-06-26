"use client";

import { useState } from "react";
import { CATEGORY_LABELS } from "@finanzas/shared";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateTransactionCategory } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string | null;
  is_subscription: number;
}

interface TransactionsListProps {
  transactions: Transaction[];
  total: number;
  onLoadMore?: () => void;
  hasMore: boolean;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  onTransactionUpdated?: () => void;
}

const FILTER_CATEGORIES: { value: string; label: string }[] = [
  { value: "all", label: "Todas" },
  ...Object.entries(CATEGORY_LABELS)
    .filter(([key]) => key !== "income")
    .map(([value, label]) => ({ value, label })),
];

const EDITABLE_CATEGORIES = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function TransactionsList({
  transactions,
  total,
  onLoadMore,
  hasMore,
  selectedCategory,
  onCategoryChange,
  selectedType,
  onTypeChange,
  onTransactionUpdated,
}: TransactionsListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);

  async function handleCategoryUpdate(txId: number, newCategory: string) {
    await updateTransactionCategory(txId, newCategory);

    const updated = (localTransactions.length > 0 ? localTransactions : transactions).map((tx) =>
      tx.id === txId ? { ...tx, category: newCategory } : tx
    );
    setLocalTransactions(updated);
    setEditingId(null);
    onTransactionUpdated?.();
  }

  async function handleToggleSubscription(txId: number, current: number) {
    const newValue = current ? 0 : 1;
    await fetch(`${API_URL}/api/transactions/${txId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isSubscription: newValue }),
    });

    const updated = (localTransactions.length > 0 ? localTransactions : transactions).map((tx) =>
      tx.id === txId ? { ...tx, is_subscription: newValue } : tx
    );
    setLocalTransactions(updated);
    onTransactionUpdated?.();
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Transacciones</h3>
        <span className="text-sm text-[var(--muted)]">{total} total</span>
      </div>

      {/* Type filter */}
      <div className="mb-3 flex gap-2">
        {[
          { value: "all", label: "Todos" },
          { value: "expense", label: "Gastos" },
          { value: "income", label: "Ingresos" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => { onTypeChange(t.value); setLocalTransactions([]); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedType === t.value
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--card-border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {FILTER_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => { onCategoryChange(cat.value); setLocalTransactions([]); }}
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
        {(localTransactions.length > 0 ? localTransactions : transactions).map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{tx.description}</p>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span>{formatDate(tx.date)}</span>
                <span>•</span>
                {editingId === tx.id ? (
                  <select
                    value={tx.category}
                    onChange={(e) => handleCategoryUpdate(tx.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className="rounded border border-[var(--accent)] bg-[var(--background)] px-1.5 py-0.5 text-xs text-[var(--foreground)]"
                  >
                    {EDITABLE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    onClick={() => setEditingId(tx.id)}
                    className="rounded bg-[var(--card-border)] px-1.5 py-0.5 hover:bg-[var(--accent)] hover:text-white transition-colors"
                    title="Click para cambiar categoría"
                  >
                    {CATEGORY_LABELS[tx.category as keyof typeof CATEGORY_LABELS] || tx.category}
                  </button>
                )}
                {tx.subcategory && (
                  <>
                    <span>•</span>
                    <span>{tx.subcategory}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleSubscription(tx.id, tx.is_subscription)}
                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                  tx.is_subscription
                    ? "bg-purple-600 text-white"
                    : "text-[var(--muted)] hover:bg-[var(--card-border)]"
                }`}
                title={tx.is_subscription ? "Quitar de suscripciones" : "Marcar como suscripción"}
              >
                🔁
              </button>
              <p
                className={`font-mono text-sm font-medium ${
                  tx.amount < 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                }`}
              >
                {tx.amount < 0 ? "-" : "+"}
                {formatCurrency(Math.abs(tx.amount))}
              </p>
            </div>
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
