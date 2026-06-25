import { google } from "googleapis";
import { getAuthenticatedClient } from "./auth.js";
import { parseEmailBody } from "./parser.js";
import { getDb } from "../db.js";
import { Transaction } from "@finanzas/shared";

const BANCOLOMBIA_SENDER = "alertasynotificaciones@an.notificacionesbancolombia.com";

/**
 * Sync emails from Gmail. Reads Bancolombia notifications and inserts new transactions.
 * On first run, fetches all. On subsequent runs, only fetches since last sync.
 */
export async function syncGmailTransactions(
  maxResults = 500,
  afterDate?: string
): Promise<{ added: number; skipped: number; errors: number }> {
  const auth = getAuthenticatedClient();
  if (!auth) {
    throw new Error("Gmail not connected. Please connect your Gmail first.");
  }

  const gmail = google.gmail({ version: "v1", auth });
  const db = getDb();

  // If no afterDate provided, use last sync date from DB
  if (!afterDate) {
    const lastSync = db.prepare(
      "SELECT MAX(date) as last_date FROM transactions WHERE balance = 0"
    ).get() as { last_date: string | null };

    if (lastSync?.last_date) {
      // Format for Gmail query: YYYY/MM/DD
      afterDate = lastSync.last_date.replace(/-/g, "/");
    }
  }

  // Build query
  let query = `from:${BANCOLOMBIA_SENDER}`;
  if (afterDate) {
    query += ` after:${afterDate}`;
  }

  // Get messages list
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messages = listResponse.data.messages || [];
  let added = 0;
  let skipped = 0;
  let errors = 0;

  const insertStmt = db.prepare(`
    INSERT INTO transactions (date, description, amount, balance, category, subcategory, is_subscription)
    SELECT ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE date = ? AND description = ? AND amount = ?
    )
  `);

  for (const msg of messages) {
    try {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "full",
      });

      const body = extractBody(detail.data);
      if (!body) {
        skipped++;
        continue;
      }

      const transaction = parseEmailBody(body);
      if (!transaction) {
        skipped++;
        continue;
      }

      // Insert only if not duplicate
      const result = insertStmt.run(
        transaction.date,
        transaction.description,
        transaction.amount,
        transaction.balance,
        transaction.category,
        transaction.subcategory || null,
        transaction.isSubscription ? 1 : 0,
        // WHERE NOT EXISTS params
        transaction.date,
        transaction.description,
        transaction.amount
      );

      if (result.changes > 0) {
        added++;
      } else {
        skipped++;
      }
    } catch (e) {
      errors++;
    }
  }

  return { added, skipped, errors };
}

/**
 * Extract the text body from a Gmail message.
 */
function extractBody(message: any): string | null {
  const payload = message.payload;
  if (!payload) return null;

  // Simple text body
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  // Multipart - look for text/html or text/plain
  const parts = payload.parts || [];
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    if (part.mimeType === "text/html" && part.body?.data) {
      return Buffer.from(part.body.data, "base64url").toString("utf-8");
    }
    // Nested multipart
    if (part.parts) {
      for (const subpart of part.parts) {
        if (subpart.body?.data) {
          return Buffer.from(subpart.body.data, "base64url").toString("utf-8");
        }
      }
    }
  }

  return null;
}
