import { extractText, getDocumentProxy } from "unpdf";
import { Transaction, ParsedStatement } from "@finanzas/shared";
import { categorizeTransaction, isLikelySubscription } from "@finanzas/shared";

interface RawTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number;
}

/**
 * Parse a Bancolombia savings account PDF statement.
 */
export async function parseBancolombiaStatement(
  buffer: Buffer,
  password?: string
): Promise<ParsedStatement> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    password: password || undefined,
  });

  const { text: pages } = await extractText(pdf, { mergePages: false });

  // Extract metadata from first page
  const firstPage = pages[0] || "";

  const periodMatch = firstPage.match(
    /DESDE:\s*(\d{4}\/\d{2}\/\d{2})\s*HASTA:\s*(\d{4}\/\d{2}\/\d{2})/
  );
  const accountMatch = firstPage.match(/NÚMERO\s+(\d+)/);

  const periodStart = periodMatch ? periodMatch[1].replace(/\//g, "-") : "";
  const periodEnd = periodMatch ? periodMatch[2].replace(/\//g, "-") : "";
  const accountNumber = accountMatch ? accountMatch[1] : "";

  // Determine the year range
  const startYear = periodStart ? parseInt(periodStart.split("-")[0]) : new Date().getFullYear();
  const startMonth = periodStart ? parseInt(periodStart.split("-")[1]) : 1;
  const endYear = periodEnd ? parseInt(periodEnd.split("-")[0]) : startYear;

  // Parse transactions from all pages
  const rawTransactions: RawTransaction[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageTxs = parsePage(pages[i], startYear, startMonth, endYear);
    rawTransactions.push(...pageTxs);
  }

  // Convert to typed transactions with categories
  const transactions: Transaction[] = rawTransactions.map((raw) => {
    const { category, subcategory } = categorizeTransaction(raw.description);
    return {
      date: raw.date,
      description: raw.description,
      amount: raw.amount,
      balance: raw.balance,
      category,
      subcategory,
      isSubscription: isLikelySubscription(raw.description),
    };
  });

  // Extract balances
  const previousBalance = transactions.length > 0
    ? transactions[0].balance - transactions[0].amount
    : 0;
  const finalBalance = transactions.length > 0
    ? transactions[transactions.length - 1].balance
    : 0;

  return {
    accountNumber,
    periodStart,
    periodEnd,
    previousBalance,
    finalBalance,
    transactions,
  };
}

/**
 * Parse a single page. Page 1 has inline format, pages 2+ have columnar format.
 */
function parsePage(
  pageText: string,
  startYear: number,
  startMonth: number,
  endYear: number
): RawTransaction[] {
  // First try inline format (page 1 style):
  // "2/01 PAGO SMARTFIT ALTO PRADO -99,900.00 16,246,903.92"
  const inlineResults = parseInlineFormat(pageText, startYear, startMonth, endYear);

  if (inlineResults.length > 0) {
    return inlineResults;
  }

  // Otherwise use columnar format (pages 2+ style):
  // Dates block, then descriptions block, then amounts block, then balances block
  return parseColumnarFormat(pageText, startYear, startMonth, endYear);
}

/**
 * Parse page 1 style where each transaction is on a single line:
 * "d/mm DESCRIPTION amount balance"
 */
function parseInlineFormat(
  pageText: string,
  startYear: number,
  startMonth: number,
  endYear: number
): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const lines = pageText.split("\n");

  // Match: date + description + amount + balance on same line
  const txRegex = /^(\d{1,2}\/\d{2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;

  for (const line of lines) {
    const match = line.trim().match(txRegex);
    if (match) {
      const [, dateStr, description, amountStr, balanceStr] = match;
      const isoDate = resolveDate(dateStr, startYear, startMonth, endYear);

      transactions.push({
        date: isoDate,
        description: description.trim(),
        amount: parseAmount(amountStr),
        balance: parseAmount(balanceStr),
      });
    }
  }

  return transactions;
}

/**
 * Parse pages 2+ style where data is in separate column blocks:
 * Block 1: All dates (d/mm per line)
 * Block 2: All descriptions (text per line)
 * Block 3: All amounts (number per line, can be negative)
 * Block 4: All balances (number per line, always positive)
 */
function parseColumnarFormat(
  pageText: string,
  startYear: number,
  startMonth: number,
  endYear: number
): RawTransaction[] {
  const lines = pageText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Find where transaction data starts (after "SALDO" header)
  const headerIdx = lines.findIndex(
    (l) => l.includes("FECHA") && l.includes("DESCRIPCIÓN")
  );
  if (headerIdx === -1) return [];

  // Everything after the header line
  const dataLines = lines.slice(headerIdx + 1);

  // Patterns
  const datePattern = /^\d{1,2}\/\d{2}$/;
  const amountPattern = /^-?[\d,]+\.\d{2}$/;

  // Collect blocks
  const dates: string[] = [];
  const descriptions: string[] = [];
  const amounts: number[] = [];
  const balances: number[] = [];

  let phase: "dates" | "descriptions" | "amounts" | "balances" = "dates";

  for (const line of dataLines) {
    if (phase === "dates") {
      if (datePattern.test(line)) {
        dates.push(line);
      } else if (dates.length > 0) {
        // Transition to descriptions
        phase = "descriptions";
        descriptions.push(line);
      }
    } else if (phase === "descriptions") {
      if (amountPattern.test(line)) {
        // Transition to amounts
        phase = "amounts";
        amounts.push(parseAmount(line));
      } else {
        descriptions.push(line);
      }
    } else if (phase === "amounts") {
      if (amountPattern.test(line)) {
        // Check if we've collected enough amounts (same count as dates)
        if (amounts.length < dates.length) {
          amounts.push(parseAmount(line));
        } else {
          // Transition to balances
          phase = "balances";
          balances.push(parseAmount(line));
        }
      }
    } else if (phase === "balances") {
      if (amountPattern.test(line)) {
        balances.push(parseAmount(line));
      }
    }
  }

  // Zip them together
  const count = Math.min(dates.length, descriptions.length, amounts.length, balances.length);
  const transactions: RawTransaction[] = [];

  for (let i = 0; i < count; i++) {
    const isoDate = resolveDate(dates[i], startYear, startMonth, endYear);
    transactions.push({
      date: isoDate,
      description: descriptions[i],
      amount: amounts[i],
      balance: balances[i],
    });
  }

  return transactions;
}

/**
 * Convert "d/mm" to ISO date, resolving the year based on period boundaries.
 */
function resolveDate(
  dateStr: string,
  startYear: number,
  startMonth: number,
  endYear: number
): string {
  const [day, month] = dateStr.split("/").map(Number);

  let year: number;
  if (startYear === endYear) {
    year = startYear;
  } else {
    // Period crosses year boundary (e.g., Dec 2025 to Mar 2026)
    year = month >= startMonth ? startYear : endYear;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseAmount(str: string): number {
  const cleaned = str.replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
