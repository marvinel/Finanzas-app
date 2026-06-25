import { Router } from "express";
import { getDb } from "../db.js";
import { MonthlySummary, SpendingSummary, TransactionCategory } from "@finanzas/shared";

const router = Router();

// GET /api/summary/monthly - Get monthly summary
router.get("/monthly", (req, res) => {
  const { months = "3" } = req.query;
  const db = getDb();

  // Get all transactions grouped by month
  const rows = db
    .prepare(
      `SELECT 
        strftime('%Y-%m', date) as month,
        category,
        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses,
        COUNT(*) as count
      FROM transactions
      GROUP BY month, category
      ORDER BY month DESC`
    )
    .all() as {
    month: string;
    category: TransactionCategory;
    income: number;
    expenses: number;
    count: number;
  }[];

  // Group by month
  const monthlyMap = new Map<string, MonthlySummary>();

  for (const row of rows) {
    if (!monthlyMap.has(row.month)) {
      monthlyMap.set(row.month, {
        month: row.month,
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        byCategory: [],
      });
    }

    const monthly = monthlyMap.get(row.month)!;
    monthly.totalIncome += row.income;
    monthly.totalExpenses += row.expenses;

    if (row.category !== "income") {
      monthly.byCategory.push({
        category: row.category,
        total: row.expenses,
        count: row.count,
        percentage: 0, // calculated after
      });
    }
  }

  // Calculate percentages and balance
  const summaries: MonthlySummary[] = Array.from(monthlyMap.values())
    .map((m) => {
      m.balance = m.totalIncome - m.totalExpenses;
      const totalExp = m.byCategory.reduce((s, c) => s + c.total, 0);
      m.byCategory = m.byCategory
        .map((c) => ({
          ...c,
          percentage: totalExp > 0 ? Math.round((c.total / totalExp) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
      return m;
    })
    .slice(0, Number(months));

  res.json(summaries);
});

// GET /api/summary/categories - Get spending by category for a period
router.get("/categories", (req, res) => {
  const { startDate, endDate } = req.query;
  const db = getDb();

  let query = `
    SELECT 
      category,
      SUM(ABS(amount)) as total,
      COUNT(*) as count
    FROM transactions
    WHERE amount < 0 AND category NOT IN ('income')
  `;
  const params: any[] = [];

  if (startDate) {
    query += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND date <= ?";
    params.push(endDate);
  }

  query += " GROUP BY category ORDER BY total DESC";

  const rows = db.prepare(query).all(...params) as {
    category: TransactionCategory;
    total: number;
    count: number;
  }[];

  const totalExpenses = rows.reduce((s, r) => s + r.total, 0);

  const result = rows.map((r) => ({
    ...r,
    percentage: totalExpenses > 0 ? Math.round((r.total / totalExpenses) * 10000) / 100 : 0,
  }));

  res.json({ categories: result, totalExpenses });
});

// GET /api/summary/top-merchants - Top places where money is spent
router.get("/top-merchants", (req, res) => {
  const { limit = "10", startDate, endDate } = req.query;
  const db = getDb();

  let query = `
    SELECT 
      description,
      category,
      subcategory,
      COUNT(*) as count,
      SUM(ABS(amount)) as total,
      AVG(ABS(amount)) as average
    FROM transactions
    WHERE amount < 0 AND category NOT IN ('income', 'transfers')
  `;
  const params: any[] = [];

  if (startDate) {
    query += " AND date >= ?";
    params.push(startDate);
  }
  if (endDate) {
    query += " AND date <= ?";
    params.push(endDate);
  }

  query += " GROUP BY description ORDER BY total DESC LIMIT ?";
  params.push(Number(limit));

  const merchants = db.prepare(query).all(...params);
  res.json(merchants);
});

// GET /api/summary/balance - Get estimated current balance
router.get("/balance", (_req, res) => {
  const db = getDb();

  // Get the saved base balance
  const setting = db.prepare(
    "SELECT value, updated_at FROM settings WHERE key = 'base_balance'"
  ).get() as { value: string; updated_at: string } | undefined;

  if (!setting) {
    res.json({ balance: null, hasBaseBalance: false });
    return;
  }

  const { amount: baseAmount, date: baseDate } = JSON.parse(setting.value);

  // Sum all transactions AFTER the base balance was set (by created_at, not date)
  const subsequent = db.prepare(
    `SELECT SUM(amount) as total FROM transactions WHERE created_at > ?`
  ).get(setting.updated_at) as { total: number | null };

  const currentBalance = baseAmount + (subsequent.total || 0);

  res.json({
    balance: Math.round(currentBalance * 100) / 100,
    baseAmount,
    baseDate,
    adjustment: Math.round((subsequent.total || 0) * 100) / 100,
    hasBaseBalance: true,
  });
});

// POST /api/summary/balance - Set the current balance
router.post("/balance", (req, res) => {
  const { balance } = req.body;

  if (balance === undefined || balance === null) {
    res.status(400).json({ error: "balance is required" });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const today = now.split("T")[0];

  const value = JSON.stringify({ amount: Number(balance), date: today });

  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES ('base_balance', ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(value, now);

  res.json({ success: true, balance: Number(balance), date: today });
});

export { router as summaryRouter };
