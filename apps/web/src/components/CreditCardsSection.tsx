"use client";

import { useState, useEffect } from "react";
import { formatCurrency, formatDate } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface CreditCard {
  id: number;
  card_number: string;
  card_type: string;
  currency: string;
  period_start: string;
  period_end: string;
  payment_due_date: string;
  total_debt: number;
  total_credit: number;
  available_credit: number;
  minimum_payment: number;
  total_payment: number;
}

interface Movement {
  id: number;
  date: string;
  description: string;
  amount: number;
  installments: string | null;
  installment_amount: number | null;
  pending_balance: number | null;
}

export function CreditCardsSection() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    const res = await fetch(`${API_URL}/api/credit-cards`);
    const data = await res.json();
    setCards(data.cards);
  }

  async function loadMovements(cardNumber: string, currency?: string) {
    const params = currency ? `?currency=${currency}` : "";
    const res = await fetch(`${API_URL}/api/credit-cards/${cardNumber}/movements${params}`);
    const data = await res.json();
    setMovements(data.movements);
    setSelectedCard(cardNumber);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch(`${API_URL}/api/credit-cards/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadResult(`✅ ${data.cards.map((c: any) => `${c.cardType} *${c.cardNumber} (${c.currency}): ${c.movements} movimientos`).join(", ")}`);
        setShowUpload(false);
        loadCards();
      } else {
        setUploadResult(`❌ ${data.error}`);
      }
    } catch {
      setUploadResult("❌ Error al procesar");
    } finally {
      setUploading(false);
    }
  }

  const formatCardCurrency = (amount: number, currency: string) => {
    if (currency === "USD") {
      return `US$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    }
    return formatCurrency(amount);
  };

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Tarjetas de Crédito</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--card-border)]"
        >
          📄 Subir Extracto TC
        </button>
      </div>

      {uploadResult && (
        <p className="mb-4 text-sm">{uploadResult}</p>
      )}

      {/* Upload form */}
      {showUpload && (
        <form onSubmit={handleUpload} className="mb-6 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[var(--muted)]">PDF Extracto TC</label>
              <input
                type="file"
                name="statement"
                accept=".pdf"
                required
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Contraseña</label>
              <input
                type="password"
                name="password"
                placeholder="Cédula"
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              {uploading ? "..." : "Subir"}
            </button>
          </div>
        </form>
      )}

      {/* Cards grid */}
      {cards.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No hay tarjetas cargadas. Sube un extracto de TC.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {cards.map((card) => (
            <button
              key={card.id}
              onClick={() => loadMovements(card.card_number, card.currency)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                selectedCard === card.card_number
                  ? "border-[var(--accent)] bg-[var(--accent)]/10"
                  : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--accent)]/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">{card.card_type} *{card.card_number}</span>
                <span className="text-xs rounded bg-[var(--card-border)] px-2 py-0.5">{card.currency}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Deuda</span>
                  <span className="font-medium text-[var(--danger)]">
                    {formatCardCurrency(card.total_debt, card.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Disponible</span>
                  <span className="font-medium text-[var(--success)]">
                    {formatCardCurrency(card.available_credit, card.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Pagar antes de</span>
                  <span className="font-medium">
                    {card.payment_due_date ? formatDate(card.payment_due_date) : "-"}
                  </span>
                </div>
              </div>
              {/* Usage bar */}
              <div className="mt-3">
                <div className="h-2 w-full rounded-full bg-[var(--card-border)]">
                  <div
                    className="h-2 rounded-full bg-[var(--accent)]"
                    style={{ width: `${card.total_credit > 0 ? ((card.total_credit - card.available_credit) / card.total_credit) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {card.total_credit > 0 ? Math.round(((card.total_credit - card.available_credit) / card.total_credit) * 100) : 0}% usado de {formatCardCurrency(card.total_credit, card.currency)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Movements */}
      {selectedCard && movements.length > 0 && (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h3 className="mb-3 text-lg font-semibold">Movimientos</h3>
          <div className="space-y-2">
            {movements.map((mov) => (
              <div key={mov.id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] p-3">
                <div>
                  <p className="text-sm font-medium">{mov.description}</p>
                  <div className="flex gap-2 text-xs text-[var(--muted)]">
                    <span>{formatDate(mov.date)}</span>
                    {mov.installments && (
                      <>
                        <span>•</span>
                        <span>Cuota {mov.installments}</span>
                      </>
                    )}
                    {mov.pending_balance !== null && mov.pending_balance > 0 && (
                      <>
                        <span>•</span>
                        <span>Pendiente: ${mov.pending_balance.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <p className={`font-mono text-sm font-medium ${
                  mov.amount < 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}>
                  {mov.amount < 0 ? "-" : ""}${Math.abs(mov.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
