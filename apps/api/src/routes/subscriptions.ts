import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/subscriptions - List detected subscriptions
router.get("/", (_req, res) => {
  const db = getDb();

  const subscriptions = db
    .prepare(
      `SELECT 
        COALESCE(subcategory, description) as name,
        category,
        COUNT(*) as occurrences,
        (SELECT t2.amount FROM transactions t2 
         WHERE t2.is_subscription = 1 AND COALESCE(t2.subcategory, t2.description) = COALESCE(transactions.subcategory, transactions.description)
         ORDER BY t2.date DESC LIMIT 1) as amount,
        MAX(date) as last_charged,
        1 as is_active
      FROM transactions
      WHERE is_subscription = 1
      GROUP BY COALESCE(subcategory, description)
      ORDER BY ABS(amount) DESC`
    )
    .all();

  res.json({ subscriptions });
});

// GET /api/subscriptions/:name/history - Get all charges for a subscription
router.get("/:name/history", (req, res) => {
  const { name } = req.params;
  const db = getDb();

  const charges = db
    .prepare(
      `SELECT date, amount, description
      FROM transactions
      WHERE is_subscription = 1 AND (subcategory = ? OR description = ?)
      ORDER BY date DESC`
    )
    .all(name, name);

  res.json({ name, charges });
});

// PATCH /api/subscriptions/:id - Toggle active status
router.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const db = getDb();
  db.prepare("UPDATE subscriptions SET is_active = ? WHERE id = ?").run(
    isActive ? 1 : 0,
    id
  );

  res.json({ success: true });
});

export { router as subscriptionsRouter };
