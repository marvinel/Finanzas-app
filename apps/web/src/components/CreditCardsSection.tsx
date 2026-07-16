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
  currency: string;
}

export function CreditCardsSection() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [installments, setInstallments] = useState<Movement[]>([]);
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

  async function loadMovements(cardNumber: string) {
    const res = await fetch(`${API_URL}/api/credit-cards/${cardNumber}/movements`);
    const data = await res.json();
    setMovements(data.movements);
    setInstallments(data.installments);
    setSelectedCard(cardNumber === selectedCard ? null : cardNumber);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setUploading(true);
    setUploadResult(null);

    try {
      const res = await fetch(`${API_URL}/api/credit-cards/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult(`✅ Cargado: ${data.cards.map((c: any) => `${c.cardType} *${c.cardNumber}`).join(", ")}`);
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

  // Group cards by physical card (card_number)
  const groupedCards = cards.reduce((acc, card) => {
    if (!acc[card.card_number]) {
      acc[card.card_number] = { type: card.card_type, currencies: [] };
    }
    acc[card.card_number].currencies.push(card);
    return acc;
  }, {} as Record<string, { type: string; currencies: CreditCard[] }>);

  const fmt = (amount: number, currency: string) => {
    if (currency === "USD") return `US$ ${amount.toFixed(2)}`;
    return formatCurrency(amount);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Tarjetas de Crédito</h2>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--card-border)]"
        >
          📄 Subir Extracto TC
        </button>
      </div>

      {uploadResult && <p className="mb-4 text-sm">{uploadResult}</p>}

      {showUpload && (
        <form onSubmit={handleUpload} className="mb-6 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-[var(--muted)]">PDF Extracto TC</label>
              <input type="file" name="statement" accept=".pdf" required
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[var(--muted)]">Contraseña</label>
              <input type="password" name="password" placeholder="Cédula"
                className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={uploading}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50">
              {uploading ? "..." : "Subir"}
            </button>
          </div>
        </form>
      )}

      {Object.keys(groupedCards).length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No hay tarjetas cargadas. Sube un extracto de TC.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedCards).map(([cardNum, group]) => {
            const mainCard = group.currencies[0];
            const totalDebt = group.currencies.reduce((s, c) => {
              return s + (c.currency === "USD" ? c.total_debt * 4200 : c.total_debt);
            }, 0);
            const isExpanded = selectedCard === cardNum;

            return (
              <div key={cardNum} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
                {/* Card Header */}
                <button
                  onClick={() => loadMovements(cardNum)}
                  className="w-full p-4 text-left hover:bg-[var(--card-border)]/20 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{group.type} *{cardNum}</span>
                      <span className="text-xs text-[var(--muted)]">
                        Pagar antes: {mainCard.payment_due_date ? formatDate(mainCard.payment_due_date) : "-"}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[var(--muted)]">Deuda total</p>
                      <p className="text-lg font-bold text-[var(--danger)]">
                        {formatCurrency(totalDebt)}
                      </p>
                    </div>
                  </div>

                  {/* Currency breakdown */}
                  <div className="mt-3 flex gap-4">
                    {group.currencies.map((c) => (
                      <div key={c.currency} className="flex-1 rounded-lg bg-[var(--background)] p-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[var(--muted)]">{c.currency}</span>
                          <span className="font-medium">{fmt(c.total_debt, c.currency)}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--card-border)]">
                          <div
                            className="h-1.5 rounded-full bg-[var(--accent)]"
                            style={{ width: `${c.total_credit > 0 ? ((c.total_credit - c.available_credit) / c.total_credit) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                          Disponible: {fmt(c.available_credit, c.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </button>

                {/* Expanded: Installments + Movements */}
                {isExpanded && (
                  <div className="border-t border-[var(--card-border)] p-4">
                    {/* Active installments */}
                    {installments.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-3 text-sm font-semibold">Compras Diferidas Activas</h4>
                        <div className="space-y-3">
                          {installments.map((inst) => {
                            const [current, total] = (inst.installments || "0/0").split("/").map(Number);
                            const progress = total > 0 ? (current / total) * 100 : 0;
                            const paid = inst.installment_amount ? inst.installment_amount * current : 0;

                            return (
                              <div key={inst.id} className="rounded-lg border border-[var(--card-border)] p-3">
                                <div className="flex justify-between mb-1">
                                  <span className="text-sm font-medium">{inst.description}</span>
                                  <span className="text-xs text-[var(--muted)]">{inst.currency}</span>
                                </div>
                                <div className="flex justify-between text-xs text-[var(--muted)] mb-2">
                                  <span>Compra: {fmt(inst.amount, inst.currency)}</span>
                                  <span>Cuota: {fmt(inst.installment_amount || 0, inst.currency)}/mes</span>
                                </div>
                                {/* Progress bar */}
                                <div className="h-2 w-full rounded-full bg-[var(--card-border)]">
                                  <div
                                    className="h-2 rounded-full bg-[var(--success)]"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
                                  <span>Cuota {current}/{total}</span>
                                  <span>Pagado: ~{fmt(paid, inst.currency)}</span>
                                  <span>Pendiente: {fmt(inst.pending_balance || 0, inst.currency)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent movements */}
                    {movements.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-sm font-semibold">Últimos Movimientos</h4>
                        <div className="space-y-2">
                          {movements.map((mov) => (
                            <div key={mov.id} className="flex justify-between items-center text-sm border-b border-[var(--card-border)] pb-2 last:border-0">
                              <div>
                                <p className="font-medium">{mov.description}</p>
                                <p className="text-xs text-[var(--muted)]">{formatDate(mov.date)}</p>
                              </div>
                              <p className={`font-mono ${mov.amount < 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                                {fmt(Math.abs(mov.amount), mov.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
