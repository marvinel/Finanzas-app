"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import { setBalance as saveBalance } from "@/lib/api";

interface BalanceCardProps {
  balance: number | null;
  hasBaseBalance: boolean;
  onUpdate: () => void;
}

export function BalanceCard({ balance, hasBaseBalance, onUpdate }: BalanceCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = parseFloat(inputValue.replace(/[^0-9.-]/g, ""));
    if (isNaN(amount)) return;

    setSaving(true);
    try {
      await saveBalance(amount);
      setEditing(false);
      setInputValue("");
      onUpdate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-[var(--muted)]">Saldo Actual</p>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          {editing ? "Cancelar" : "Actualizar"}
        </button>
      </div>

      {hasBaseBalance && balance !== null ? (
        <p className="text-2xl font-bold text-[var(--foreground)]">
          {formatCurrency(balance)}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted)]">Sin saldo registrado</p>
      )}

      {editing && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ej: 5459330"
            className="flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-1.5 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            onClick={handleSave}
            disabled={saving || !inputValue}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      )}
    </div>
  );
}
