"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/format";
import { getSubscriptionHistory } from "@/lib/api";

interface Subscription {
  name: string;
  amount: number;
  occurrences: number;
  last_charged: string;
  is_active: number;
}

interface Charge {
  date: string;
  amount: number;
  description: string;
}

interface SubscriptionsListProps {
  subscriptions: Subscription[];
}

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [loading, setLoading] = useState(false);

  const monthlyTotal = subscriptions.reduce(
    (sum, s) => sum + Math.abs(s.amount),
    0
  );

  async function toggleExpand(name: string) {
    if (expanded === name) {
      setExpanded(null);
      return;
    }

    setLoading(true);
    setExpanded(name);
    try {
      const data = await getSubscriptionHistory(name);
      setCharges(data.charges);
    } catch {
      setCharges([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Suscripciones</h3>
        <span className="text-sm text-[var(--muted)]">
          {formatCurrency(monthlyTotal)}/mes
        </span>
      </div>
      <div className="space-y-2">
        {subscriptions.map((sub) => (
          <div key={sub.name}>
            <button
              onClick={() => toggleExpand(sub.name)}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--card-border)] p-3 text-left hover:bg-[var(--card-border)]/30 transition-colors"
            >
              <div>
                <p className="font-medium">{sub.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {sub.occurrences} cobros • Último: {formatDate(sub.last_charged)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-[var(--danger)]">
                  {formatCurrency(Math.abs(sub.amount))}
                </p>
                <span className="text-xs text-[var(--muted)]">
                  {expanded === sub.name ? "▲" : "▼"}
                </span>
              </div>
            </button>

            {expanded === sub.name && (
              <div className="mt-1 ml-3 border-l-2 border-[var(--card-border)] pl-3 py-2 space-y-2">
                {loading ? (
                  <p className="text-xs text-[var(--muted)]">Cargando...</p>
                ) : charges.length > 0 ? (
                  charges.map((charge, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-[var(--muted)]">
                        {formatDate(charge.date)}
                      </span>
                      <span className="font-mono text-[var(--danger)]">
                        {formatCurrency(Math.abs(charge.amount))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[var(--muted)]">Sin historial</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
