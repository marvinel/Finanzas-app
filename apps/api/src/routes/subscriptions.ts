import { Router } from "express";
import { getDb } from "../db.js";

const router = Router();

// GET /api/subscriptions - List detected subscriptions
router.get("/", (_req, res) => {
  const db = getDb();

  const subscriptions = db
    .prepare(
      `SELECT * FROM subscriptions ORDER BY is_active DESC, ABS(amount) DESC`
    )
    .all();

  // Also get recurring charges from transactions
  const recurring = db
    .prepare(
      `SELECT 
        description,
        subcategory,
        category,
        COUNT(*) as occurrences,
        AVG(amount) as avg_amount,
        MAX(date) as last_date
      FROM transactions
      WHERE is_subscription = 1
      GROUP BY description
      ORDER BY occurrences DESC`
    )
    .all();

  res.json({ subscriptions, recurring });
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
