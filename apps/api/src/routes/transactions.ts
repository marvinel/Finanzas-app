import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

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
  const { category, subcategory } = req.body;

  if (!category) {
    res.status(400).json({ error: "category is required" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE transactions SET category = ?, subcategory = ? WHERE id = ?")
    .run(category, subcategory || null, id);

  if (result.changes === 0) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json({ success: true });
});

export { router as transactionsRouter };
