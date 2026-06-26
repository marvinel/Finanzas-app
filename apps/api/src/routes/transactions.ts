import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// POST /api/transactions - Create a manual transaction
router.post("/", (req, res) => {
  const { date, description, amount, category, subcategory } = req.body;

  if (!date || !description || amount === undefined) {
    res.status(400).json({ error: "date, description, and amount are required" });
    return;
  }

  const { categorizeTransaction, isLikelySubscription } = require("@finanzas/shared");
  const auto = categorizeTransaction(description);
  const finalCategory = category || auto.category;
  const finalSubcategory = subcategory || auto.subcategory || null;
  const isSub = isLikelySubscription(description) ? 1 : 0;

  const db = getDb();
  const result = db.prepare(
    `INSERT INTO transactions (date, description, amount, balance, category, subcategory, is_subscription)
     VALUES (?, ?, ?, 0, ?, ?, ?)`
  ).run(date, description, amount, finalCategory, finalSubcategory, isSub);

  res.json({ success: true, id: result.lastInsertRowid });
});

// GET /api/transactions - List transactions with optional filters
router.get("/", (req, res) => {
  const { category, startDate, endDate, search, type, limit = "50", offset = "0" } = req.query;

  let query = "SELECT * FROM transactions WHERE 1=1";
  const params: any[] = [];

  if (category && category !== "all") {
    query += " AND category = ?";
    params.push(category);
  }

  if (type === "income") {
    query += " AND amount > 0";
  } else if (type === "expense") {
    query += " AND amount < 0";
  }

  if (startDate) {
    query += " AND date >= ?";
    params.push(startDate);
  }

  if (endDate) {
    query += " AND date <= ?";
    params.push(endDate);
  }

  if (search) {
    query += " AND description LIKE ?";
    params.push(`%${search}%`);
  }

  // Get total count
  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
  const db = getDb();
  const { total } = db.prepare(countQuery).get(...params) as { total: number };

  // Add pagination and ordering
  query += " ORDER BY date DESC, id DESC LIMIT ? OFFSET ?";
  params.push(Number(limit), Number(offset));

  const transactions = db.prepare(query).all(...params);

  res.json({
    transactions,
    total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

// PATCH /api/transactions/:id - Update a transaction's category
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { category, subcategory, isSubscription } = req.body;

  const db = getDb();
  
  if (category) {
    db.prepare("UPDATE transactions SET category = ?, subcategory = ? WHERE id = ?")
      .run(category, subcategory || null, id);
  }

  if (isSubscription !== undefined) {
    db.prepare("UPDATE transactions SET is_subscription = ? WHERE id = ?")
      .run(isSubscription ? 1 : 0, id);
  }

  const updated = db.prepare("SELECT * FROM transactions WHERE id = ?").get(id);
  if (!updated) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ success: true });
});

export { router as transactionsRouter };
