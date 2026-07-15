import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseCreditCardStatement } from "../parser/credit-card.js";
import { getDb } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const uploadsDir = path.join(__dirname, "..", "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/credit-cards/upload - Upload a credit card statement
router.post("/upload", upload.single("statement"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const password = req.body.password || undefined;
    const buffer = fs.readFileSync(req.file.path);
    const statements = await parseCreditCardStatement(buffer, password);

    if (statements.length === 0) {
      res.status(400).json({ error: "No credit card data found in PDF" });
      return;
    }

    const db = getDb();

    for (const stmt of statements) {
      // Upsert card info
      db.prepare(`
        INSERT INTO credit_cards (card_number, card_type, currency, period_start, period_end, payment_due_date, total_debt, total_credit, available_credit, minimum_payment, total_payment, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          period_start = excluded.period_start,
          period_end = excluded.period_end,
          payment_due_date = excluded.payment_due_date,
          total_debt = excluded.total_debt,
          total_credit = excluded.total_credit,
          available_credit = excluded.available_credit,
          minimum_payment = excluded.minimum_payment,
          total_payment = excluded.total_payment,
          updated_at = datetime('now')
      `).run(
        stmt.cardNumber, stmt.cardType, stmt.currency,
        stmt.periodStart, stmt.periodEnd, stmt.paymentDueDate,
        stmt.totalDebt, stmt.totalCredit, stmt.availableCredit,
        stmt.minimumPayment, stmt.totalPayment
      );

      // Delete old movements for this card+currency+period and insert fresh
      db.prepare(
        "DELETE FROM credit_card_movements WHERE card_number = ? AND currency = ? AND date >= ? AND date <= ?"
      ).run(stmt.cardNumber, stmt.currency, stmt.periodStart, stmt.periodEnd);

      const insertMov = db.prepare(`
        INSERT INTO credit_card_movements (card_number, currency, date, description, amount, installments, installment_amount, pending_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const mov of stmt.movements) {
        insertMov.run(
          stmt.cardNumber, stmt.currency, mov.date, mov.description,
          mov.amount, mov.installments || null, mov.installmentAmount || null, mov.pendingBalance || null
        );
      }
    }

    // Clean up file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      cards: statements.map(s => ({
        cardNumber: s.cardNumber,
        cardType: s.cardType,
        currency: s.currency,
        totalDebt: s.totalDebt,
        period: `${s.periodStart} → ${s.periodEnd}`,
        movements: s.movements.length,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/credit-cards - List all cards with latest info
router.get("/", (_req, res) => {
  const db = getDb();
  const cards = db.prepare("SELECT * FROM credit_cards ORDER BY card_type, currency").all();
  res.json({ cards });
});

// GET /api/credit-cards/:cardNumber/movements - Get movements for a card
router.get("/:cardNumber/movements", (req, res) => {
  const { cardNumber } = req.params;
  const { currency } = req.query;
  const db = getDb();

  let query = "SELECT * FROM credit_card_movements WHERE card_number = ?";
  const params: any[] = [cardNumber];

  if (currency) {
    query += " AND currency = ?";
    params.push(currency);
  }

  query += " ORDER BY date DESC";
  const movements = db.prepare(query).all(...params);
  res.json({ movements });
});

export { router as creditCardsRouter };
