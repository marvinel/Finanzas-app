import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseBancolombiaStatement } from "../parser/index.js";
import { getDb } from "../db.js";
import { Transaction, SpendingSummary, TransactionCategory } from "@finanzas/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new Error("Only PDF files are allowed"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

router.post("/", upload.single("statement"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const password = req.body.password || undefined;
    const filePath = req.file.path;

    // Read the file
    const buffer = fs.readFileSync(filePath);

    // Parse the statement
    const parsed = await parseBancolombiaStatement(buffer, password);

    if (parsed.transactions.length === 0) {
      res.status(400).json({ error: "No transactions found in the PDF" });
      return;
    }

    // Store transactions in database
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO transactions (date, description, amount, balance, category, subcategory, is_subscription)
      SELECT ?, ?, ?, ?, ?, ?, ?
      WHERE NOT EXISTS (
        SELECT 1 FROM transactions WHERE date = ? AND amount = ?
      )
    `);

    const insertMany = db.transaction((transactions: Transaction[]) => {
      for (const tx of transactions) {
        insertStmt.run(
          tx.date,
          tx.description,
          tx.amount,
          tx.balance,
          tx.category,
          tx.subcategory || null,
          tx.isSubscription ? 1 : 0,
          // WHERE NOT EXISTS params
          tx.date,
          tx.amount
        );
      }
    });

    insertMany(parsed.transactions);

    // Detect and update subscriptions
    updateSubscriptions(parsed.transactions);

    // Calculate summary
    const summary = calculateSummary(parsed.transactions);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      transactionsCount: parsed.transactions.length,
      period: { start: parsed.periodStart, end: parsed.periodEnd },
      accountNumber: parsed.accountNumber,
      summary,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to process PDF" });
  }
});

function updateSubscriptions(transactions: Transaction[]): void {
  const db = getDb();
  const upsertSub = db.prepare(`
    INSERT INTO subscriptions (name, amount, category, frequency, last_charged, is_active)
    VALUES (?, ?, ?, 'monthly', ?, 1)
    ON CONFLICT(name) DO UPDATE SET
      amount = excluded.amount,
      last_charged = excluded.last_charged,
      is_active = 1
  `);

  const subs = transactions.filter((tx) => tx.isSubscription);
  for (const tx of subs) {
    upsertSub.run(
      tx.subcategory || tx.description,
      tx.amount,
      tx.category,
      tx.date
    );
  }
}

function calculateSummary(transactions: Transaction[]): SpendingSummary[] {
  const categoryTotals = new Map<TransactionCategory, { total: number; count: number }>();

  // Only count expenses (negative amounts), excluding income
  const expenses = transactions.filter(
    (tx) => tx.amount < 0 && tx.category !== "income"
  );

  for (const tx of expenses) {
    const existing = categoryTotals.get(tx.category) || { total: 0, count: 0 };
    existing.total += Math.abs(tx.amount);
    existing.count += 1;
    categoryTotals.set(tx.category, existing);
  }

  const totalExpenses = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const summary: SpendingSummary[] = Array.from(categoryTotals.entries())
    .map(([category, data]) => ({
      category,
      total: Math.round(data.total * 100) / 100,
      count: data.count,
      percentage: totalExpenses > 0
        ? Math.round((data.total / totalExpenses) * 10000) / 100
        : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return summary;
}

export { router as uploadRouter };
