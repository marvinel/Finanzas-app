"use client";

import { useState } from "react";
import { CATEGORY_LABELS } from "@finanzas/shared";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function AddTransactionModal({ isOpen, onClose, onSuccess }: AddTransactionModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!description || !amount) {
      setError("Descripción y monto son requeridos");
      return;
    }

    setLoading(true);
    setError("");

    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    const finalAmount = type === "expense" ? -numAmount : numAmount;

    try {
      const res = await fetch(`${API_URL}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description: description.toUpperCase(),
          amount: finalAmount,
          category,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar");

      onSuccess();
      onClose();
      setDescription("");
      setAmount("");
      setCategory("other");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6">
        <h2 className="mb-4 text-xl font-semibold">Agregar Transacción</h2>

        {/* Type toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setType("expense")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              type === "expense"
                ? "bg-[var(--danger)] text-white"
                : "border border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            Gasto
          </button>
          <button
            onClick={() => setType("income")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              type === "income"
                ? "bg-[var(--success)] text-white"
                : "border border-[var(--card-border)] text-[var(--muted)]"
            }`}
          >
            Ingreso
          </button>
        </div>

        {/* Date */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-[var(--muted)]">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-[var(--muted)]">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: PAGO SMARTFIT"
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="mb-1 block text-sm text-[var(--muted)]">Monto</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ej: 99900"
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-1 block text-sm text-[var(--muted)]">Categoría</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm hover:bg-[var(--card-border)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
