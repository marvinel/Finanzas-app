"use client";

import { formatCurrency } from "@/lib/format";

interface Subscription {
  id: number;
  name: string;
  amount: number;
  frequency: string;
  last_charged: string;
  is_active: number;
}

interface SubscriptionsListProps {
  subscriptions: Subscription[];
}

export function SubscriptionsList({ subscriptions }: SubscriptionsListProps) {
  const monthlyTotal = subscriptions
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Math.abs(s.amount), 0);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">Suscripciones</h3>
        <span className="text-sm text-[var(--muted)]">
          {formatCurrency(monthlyTotal)}/mes
        </span>
      </div>
      <div className="space-y-3">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3"
          >
            <div>
              <p className="font-medium">{sub.name}</p>
              <p className="text-xs text-[var(--muted)]">
                {sub.frequency === "monthly" ? "Mensual" : "Anual"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-[var(--danger)]">
                {formatCurrency(Math.abs(sub.amount))}
              </p>
              {sub.is_active ? (
                <span className="text-xs text-[var(--success)]">Activa</span>
              ) : (
                <span className="text-xs text-[var(--muted)]">Inactiva</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
