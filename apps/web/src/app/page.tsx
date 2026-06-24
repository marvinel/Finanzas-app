"use client";

import { useEffect, useState, useCallback } from "react";
import { SpendingChart } from "@/components/SpendingChart";
import { MonthlyChart } from "@/components/MonthlyChart";
import { SubscriptionsList } from "@/components/SubscriptionsList";
import { TransactionsList } from "@/components/TransactionsList";
import { UploadModal } from "@/components/UploadModal";
import {
  getMonthlySummary,
  getCategorySummary,
  getSubscriptions,
  getTransactions,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default function Dashboard() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>({ categories: [], totalExpenses: 0 });
  const [subscriptions, setSubscriptions] = useState<any>({ subscriptions: [] });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyData, catData, subsData, txData] = await Promise.all([
        getMonthlySummary(),
        getCategorySummary(),
        getSubscriptions(),
        getTransactions({ limit: 20 }),
      ]);
      setMonthly(monthlyData);
      setCategories(catData);
      setSubscriptions(subsData);
      setTransactions(txData.transactions);
      setTxTotal(txData.total);
      setTxOffset(20);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadMoreTransactions() {
    const data = await getTransactions({ limit: 20, offset: txOffset });
    setTransactions((prev) => [...prev, ...data.transactions]);
    setTxOffset((prev) => prev + 20);
  }

  const currentMonth = monthly[0];
  const isEmpty = !loading && transactions.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-[var(--muted)]">
            Control de gastos personal
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Subir Extracto
        </button>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] py-20">
          <p className="mb-2 text-lg font-medium">No hay datos todavía</p>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Sube tu extracto de Bancolombia para empezar
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Subir Extracto
          </button>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {currentMonth && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Ingresos (mes actual)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--success)]">
                  {formatCurrency(currentMonth.totalIncome)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Gastos (mes actual)</p>
                <p className="mt-1 text-2xl font-bold text-[var(--danger)]">
                  {formatCurrency(currentMonth.totalExpenses)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Balance</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    currentMonth.balance >= 0
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {formatCurrency(currentMonth.balance)}
                </p>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <h3 className="mb-4 text-lg font-semibold">Gastos por Categoría</h3>
              {categories.categories.length > 0 && (
                <SpendingChart data={categories.categories} />
              )}
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <h3 className="mb-4 text-lg font-semibold">Ingresos vs Gastos</h3>
              {monthly.length > 0 && <MonthlyChart data={monthly} />}
            </div>
          </div>

          {/* Subscriptions + Transactions */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              {subscriptions.subscriptions.length > 0 && (
                <SubscriptionsList subscriptions={subscriptions.subscriptions} />
              )}
            </div>
            <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 lg:col-span-2">
              <TransactionsList
                transactions={transactions}
                total={txTotal}
                onLoadMore={loadMoreTransactions}
                hasMore={transactions.length < txTotal}
              />
            </div>
          </div>
        </>
      )}

      <UploadModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={loadData}
      />
    </main>
  );
}
