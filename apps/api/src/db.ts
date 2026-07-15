import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "finanzas.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function initDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      balance REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      subcategory TEXT,
      is_subscription INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      category TEXT NOT NULL DEFAULT 'subscriptions',
      frequency TEXT NOT NULL DEFAULT 'monthly',
      last_charged TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_number TEXT NOT NULL,
      card_type TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      period_start TEXT,
      period_end TEXT,
      payment_due_date TEXT,
      total_debt REAL NOT NULL DEFAULT 0,
      total_credit REAL NOT NULL DEFAULT 0,
      available_credit REAL NOT NULL DEFAULT 0,
      minimum_payment REAL NOT NULL DEFAULT 0,
      total_payment REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_card_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_number TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'COP',
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      installments TEXT,
      installment_amount REAL,
      pending_balance REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_description ON transactions(description);
  `);

  console.log("Database initialized at:", DB_PATH);
}
