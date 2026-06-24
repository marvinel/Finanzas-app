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
import { formatCurrency, formatMonth } from "@/lib/format";

export default function Dashboard() {
  const [monthly, setMonthly] = useState<any[]>([]);
  const [categories, setCategories] = useState<any>({ categories: [], totalExpenses: 0 });
  const [subscriptions, setSubscriptions] = useState<any>({ subscriptions: [] });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txOffset, setTxOffset] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyData, subsData] = await Promise.all([
        getMonthlySummary(),
        getSubscriptions(),
      ]);
      setMonthly(monthlyData);
      setSubscriptions(subsData);

      // Load filtered data based on selected month
      await loadFilteredData(selectedMonth, monthlyData);
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadFilteredData(month: string, category?: string, type?: string) {
    const dateFilters = getDateRange(month);
    const cat = category ?? selectedCategory;
    const t = type ?? selectedType;

    const [catData, txData] = await Promise.all([
      getCategorySummary(dateFilters.startDate, dateFilters.endDate),
      getTransactions({
        limit: 20,
        ...dateFilters,
        category: cat !== "all" ? cat : undefined,
        type: t !== "all" ? t : undefined,
      }),
    ]);

    setCategories(catData);
    setTransactions(txData.transactions);
    setTxTotal(txData.total);
    setTxOffset(20);
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleMonthChange(month: string) {
    setSelectedMonth(month);
    setSelectedCategory("all");
    setSelectedType("all");
    await loadFilteredData(month, "all", "all");
  }

  async function handleCategoryChange(category: string) {
    setSelectedCategory(category);
    const dateFilters = getDateRange(selectedMonth);
    const txData = await getTransactions({
      limit: 20,
      ...dateFilters,
      category: category !== "all" ? category : undefined,
      type: selectedType !== "all" ? selectedType : undefined,
    });
    setTransactions(txData.transactions);
    setTxTotal(txData.total);
    setTxOffset(20);
  }

  async function handleTypeChange(type: string) {
    setSelectedType(type);
    const dateFilters = getDateRange(selectedMonth);
    const txData = await getTransactions({
      limit: 20,
      ...dateFilters,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      type: type !== "all" ? type : undefined,
    });
    setTransactions(txData.transactions);
    setTxTotal(txData.total);
    setTxOffset(20);
  }

  async function loadMoreTransactions() {
    const dateFilters = getDateRange(selectedMonth);
    const data = await getTransactions({
      limit: 20,
      offset: txOffset,
      ...dateFilters,
      category: selectedCategory !== "all" ? selectedCategory : undefined,
      type: selectedType !== "all" ? selectedType : undefined,
    });
    setTransactions((prev) => [...prev, ...data.transactions]);
    setTxOffset((prev) => prev + 20);
  }

  // Get the selected month's summary from monthly data
  const currentMonthData = selectedMonth === "all"
    ? monthly[0]
    : monthly.find((m) => m.month === selectedMonth);

  const isEmpty = !loading && transactions.length === 0 && monthly.length === 0;

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
          {/* Month Filter */}
          {monthly.length > 0 && (
            <div className="mb-6 flex gap-2 overflow-x-auto">
              <button
                onClick={() => handleMonthChange("all")}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedMonth === "all"
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--card-border)]"
                }`}
              >
                Todos
              </button>
              {monthly.map((m) => (
                <button
                  key={m.month}
                  onClick={() => handleMonthChange(m.month)}
                  className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    selectedMonth === m.month
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--card-border)]"
                  }`}
                >
                  {formatMonth(m.month)}
                </button>
              ))}
            </div>
          )}

          {/* Summary Cards */}
          {currentMonthData && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Ingresos</p>
                <p className="mt-1 text-2xl font-bold text-[var(--success)]">
                  {formatCurrency(currentMonthData.totalIncome)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Gastos</p>
                <p className="mt-1 text-2xl font-bold text-[var(--danger)]">
                  {formatCurrency(currentMonthData.totalExpenses)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">Balance</p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    currentMonthData.balance >= 0
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]"
                  }`}
                >
                  {formatCurrency(currentMonthData.balance)}
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
                selectedCategory={selectedCategory}
                onCategoryChange={handleCategoryChange}
                selectedType={selectedType}
                onTypeChange={handleTypeChange}
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

/**
 * Get start/end date range for a given month filter.
 * "all" returns no filters. "2026-03" returns that month's range.
 */
function getDateRange(month: string): { startDate?: string; endDate?: string } {
  if (month === "all") return {};

  const [year, m] = month.split("-").map(Number);
  const startDate = `${year}-${String(m).padStart(2, "0")}-01`;

  // Last day of the month
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { startDate, endDate };
}
