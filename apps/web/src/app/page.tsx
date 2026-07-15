"use client";

import { useEffect, useState, useCallback } from "react";
import { SpendingChart } from "@/components/SpendingChart";
import { MonthlyChart } from "@/components/MonthlyChart";
import { SubscriptionsList } from "@/components/SubscriptionsList";
import { TransactionsList } from "@/components/TransactionsList";
import { UploadModal } from "@/components/UploadModal";
import { BalanceCard } from "@/components/BalanceCard";
import { AddTransactionModal } from "@/components/AddTransactionModal";
import {
  getMonthlySummary,
  getCategorySummary,
  getSubscriptions,
  getTransactions,
  getGmailStatus,
  syncGmail,
  getGmailConnectUrl,
  getBalance,
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
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [gmailConnected, setGmailConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<any>({ balance: null, hasBaseBalance: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [monthlyData, subsData, gmailStatus] = await Promise.all([
        getMonthlySummary(),
        getSubscriptions(),
        getGmailStatus(),
      ]);
      setMonthly(monthlyData);
      setSubscriptions(subsData);
      setGmailConnected(gmailStatus.connected);
      await loadBalanceData();
      await loadFilteredData("all", "all", "all");
    } catch (e) {
      console.error("Error loading data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  async function loadBalanceData() {
    try {
      const data = await getBalance();
      setBalanceData(data);
    } catch {}
  }

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

  // Auto-sync on load if Gmail is connected
  useEffect(() => {
    if (gmailConnected && !syncing) {
      handleSync();
    }
  }, [gmailConnected]);

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

  async function refreshCharts() {
    const dateFilters = getDateRange(selectedMonth);
    const [catData, monthlyData, subsData] = await Promise.all([
      getCategorySummary(dateFilters.startDate, dateFilters.endDate),
      getMonthlySummary(),
      getSubscriptions(),
    ]);
    setCategories(catData);
    setMonthly(monthlyData);
    setSubscriptions(subsData);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/gmail/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxResults: 500 }),
      });
      const result = await res.json();

      if (res.status === 401 && result.reconnect) {
        setGmailConnected(false);
        setSyncResult("Token expirado — reconecta Gmail");
        return;
      }

      setSyncResult(`${result.added} nuevas`);
      if (result.added > 0) {
        await loadData();
      }
      await loadBalanceData();
    } catch (e: any) {
      setSyncResult("Error sync");
    } finally {
      setSyncing(false);
    }
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

  const currentMonthData = selectedMonth === "all"
    ? monthly.length > 0
      ? {
          totalIncome: monthly.reduce((s, m) => s + m.totalIncome, 0),
          totalExpenses: monthly.reduce((s, m) => s + m.totalExpenses, 0),
          balance: monthly.reduce((s, m) => s + m.totalIncome - m.totalExpenses, 0),
        }
      : null
    : monthly.find((m) => m.month === selectedMonth);

  const isEmpty = !loading && transactions.length === 0 && monthly.length === 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-sm text-[var(--muted)]">Control de gastos personal</p>
        </div>
        <div className="flex items-center gap-2">
          {syncResult && (
            <span className="text-xs text-[var(--success)]">{syncResult}</span>
          )}
          {gmailConnected ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--card-border)] disabled:opacity-50"
              title="Sincronizar emails de Bancolombia"
            >
              {syncing ? "⏳" : "🔄"} Sync
            </button>
          ) : (
            <a
              href={getGmailConnectUrl()}
              className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--card-border)]"
            >
              Conectar Gmail
            </a>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm hover:bg-[var(--card-border)]"
            title="Subir extracto PDF"
          >
            📄 Extracto
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            + Agregar
          </button>
        </div>
      </div>

      {/* Dashboard Content */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--card-border)] py-20">
          <p className="mb-2 text-lg font-medium">No hay datos todavía</p>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Conecta tu Gmail o sube un extracto para empezar
          </p>
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
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <BalanceCard
                balance={balanceData.balance}
                hasBaseBalance={balanceData.hasBaseBalance}
                onUpdate={loadBalanceData}
              />
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
                <p className={`mt-1 text-2xl font-bold ${
                  currentMonthData.balance >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                }`}>
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
                onTransactionUpdated={refreshCharts}
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

      <AddTransactionModal
        isOpen={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
        onSuccess={async () => { await loadData(); await refreshCharts(); }}
      />
    </main>
  );
}

function getDateRange(month: string): { startDate?: string; endDate?: string } {
  if (month === "all") return {};

  const [year, m] = month.split("-").map(Number);
  const startDate = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const endDate = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { startDate, endDate };
}
