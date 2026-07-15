import { extractText, getDocumentProxy } from "unpdf";

export interface CreditCardStatement {
  cardNumber: string; // last 4 digits
  cardType: string; // VISA, AMEX, etc
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  paymentDueDate: string; // ISO date
  currency: "COP" | "USD";
  totalDebt: number;
  totalCredit: number;
  availableCredit: number;
  minimumPayment: number;
  totalPayment: number;
  previousBalance: number;
  purchases: number;
  interestMora: number;
  interestCurrent: number;
  otherCharges: number;
  payments: number;
  movements: CreditCardMovement[];
}

export interface CreditCardMovement {
  date: string;
  description: string;
  amount: number; // negative = payment/credit, positive = charge
  installments?: string; // "6/36" format
  installmentAmount?: number;
  interestMonthly?: number;
  interestAnnual?: number;
  pendingBalance?: number;
}

/**
 * Parse a Bancolombia credit card PDF statement.
 * Handles both VISA and AMEX, in COP and USD.
 */
export async function parseCreditCardStatement(
  buffer: Buffer,
  password?: string
): Promise<CreditCardStatement[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer), {
    password: password || undefined,
  });

  const { text: pages } = await extractText(pdf, { mergePages: false });
  const statements: CreditCardStatement[] = [];

  // Process pages in pairs (summary page + movements page)
  let i = 0;
  while (i < pages.length) {
    const summaryPage = pages[i];

    // Detect card number
    const cardMatch = summaryPage.match(/Tarjeta:\s*\*+(\d{4})/);
    if (!cardMatch) { i++; continue; }
    const cardNumber = cardMatch[1];

    // Detect currency
    const currencyMatch = summaryPage.match(/Moneda:\s*(PESOS|DOLARES)/);
    const currency = currencyMatch?.[1] === "DOLARES" ? "USD" : "COP";

    // Detect card type from filename context or default
    const cardType = detectCardType(summaryPage, cardNumber);

    // Period
    const periodMatch = summaryPage.match(/Periodo facturado\s*(\d{1,2}\s+\w+)\s*-\s*(\d{1,2}\s+\w+\.?\s*\d{4})/);
    let periodStart = "";
    let periodEnd = "";
    if (periodMatch) {
      periodEnd = parseSpanishDate(periodMatch[2].trim());
      periodStart = parseSpanishDate(periodMatch[1].trim() + " " + periodEnd.split("-")[0]);
    }

    // Payment due date
    const dueMatch = summaryPage.match(/Pagar antes de:\s*(\w+\.?\s*\d{1,2},?\s*\d{4})/);
    const paymentDueDate = dueMatch ? parseSpanishDate(dueMatch[1].trim()) : "";

    // Amounts - parse Colombian format
    const debtMatch = summaryPage.match(/Deuda a la fecha de corte:\s*\$([\d.,]+)/);
    const totalDebt = debtMatch ? parseColCurrency(debtMatch[1]) : 0;

    const totalCreditMatch = summaryPage.match(/Cupo total:\s*\$\s*([\d.,]+)/);
    const totalCredit = totalCreditMatch ? parseColCurrency(totalCreditMatch[1]) : 0;

    const availableMatch = summaryPage.match(/Disponible:\s*\$\s*([\d.,]+)/);
    const availableCredit = availableMatch ? parseColCurrency(availableMatch[1]) : 0;

    const totalPaymentMatch = summaryPage.match(/Pago Total:\s*\$\s*([\d.,]+)/);
    const totalPayment = totalPaymentMatch ? parseColCurrency(totalPaymentMatch[1]) : 0;

    const minPaymentMatch = summaryPage.match(/Pago mínimo:\s*\$\s*([\d.,]+)/);
    const minimumPayment = minPaymentMatch ? parseColCurrency(minPaymentMatch[1]) : 0;

    // Resumen saldo - extract line items
    const previousBalanceMatch = summaryPage.match(/\+ Saldo anterior[\s\S]*?\$\s*([\d.,]+)/);
    const previousBalance = previousBalanceMatch ? parseColCurrency(previousBalanceMatch[1]) : 0;

    const purchasesMatch = summaryPage.match(/\+ Compras del mes[\s\S]*?\$\s*([\d.,]+)/);
    const purchases = purchasesMatch ? parseColCurrency(purchasesMatch[1]) : 0;

    const interestMoraMatch = summaryPage.match(/\+ Intereses de mora[\s\S]*?\$\s*([\d.,]+)/);
    const interestMora = interestMoraMatch ? parseColCurrency(interestMoraMatch[1]) : 0;

    const interestCurrentMatch = summaryPage.match(/\+ Intereses corrientes[\s\S]*?\$\s*([\d.,]+)/);
    const interestCurrent = interestCurrentMatch ? parseColCurrency(interestCurrentMatch[1]) : 0;

    const otherChargesMatch = summaryPage.match(/\+ Otros cargos[\s\S]*?\$\s*([\d.,]+)/);
    const otherCharges = otherChargesMatch ? parseColCurrency(otherChargesMatch[1]) : 0;

    const paymentsMatch = summaryPage.match(/\(-\) Pagos \/ abonos[\s\S]*?\$\s*([\d.,]+)/);
    const paymentsAmount = paymentsMatch ? parseColCurrency(paymentsMatch[1]) : 0;

    // Parse movements from next page
    const movements: CreditCardMovement[] = [];
    if (i + 1 < pages.length) {
      const movPage = pages[i + 1];
      if (movPage.includes("Detalles del movimiento")) {
        const movs = parseMovements(movPage, currency);
        movements.push(...movs);
        i++; // skip movements page
      }
    }

    statements.push({
      cardNumber,
      cardType,
      periodStart,
      periodEnd,
      paymentDueDate,
      currency,
      totalDebt,
      totalCredit,
      availableCredit,
      minimumPayment,
      totalPayment,
      previousBalance,
      purchases,
      interestMora,
      interestCurrent,
      otherCharges,
      payments: paymentsAmount,
      movements,
    });

    i++;
  }

  return statements;
}

function parseMovements(pageText: string, currency: string): CreditCardMovement[] {
  const movements: CreditCardMovement[] = [];
  const lines = pageText.split("\n");

  // Pattern for movement lines:
  // "DESCRIPTION AUTHORIZATION DATE $ AMOUNT $ INSTALLMENT_AMOUNT $ PENDING"
  // or simpler: "DESCRIPTION DATE $ AMOUNT"
  const movRegex = /^(.+?)(\d{2}\/\d{2}\/\d{4})\s+\$\s*(-?[\d.,]+)\s+(?:(\d+\/\d+)\s+)?\$\s*(-?[\d.,]+)(?:\s+([\d.,]+)\s*%\s+([\d.,]+)\s*%)?\s*\$\s*([\d.,]+)/;

  // Simpler regex for lines like "CUOTA DE MANEJO000000 15/06/2026 $ 28.245,00 $ 28.245,00 $ 0,00"
  const simpleRegex = /^(.+?)(\d{2}\/\d{2}\/\d{4})\s+\$\s*(-?[\d.,]+)\s+\$\s*(-?[\d.,]+)\s+\$\s*([\d.,]+)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes("DCF:") || trimmed.includes("Número de") || trimmed.includes("autorización")) continue;

    const simpleMatch = trimmed.match(simpleRegex);
    if (simpleMatch) {
      const [, desc, dateStr, amountStr, installmentStr, pendingStr] = simpleMatch;
      const description = desc.replace(/\d{6}\s*$/, "").trim(); // remove authorization number
      const amount = parseColCurrency(amountStr);
      const isCredit = trimmed.includes("ABONO") || amount < 0 || amountStr.includes("-");

      movements.push({
        date: formatDate(dateStr),
        description,
        amount: isCredit ? -Math.abs(amount) : amount,
        installmentAmount: parseColCurrency(installmentStr),
        pendingBalance: parseColCurrency(pendingStr),
      });
    }
  }

  // Also try to catch movements in the "Movimientos antes de" section
  const beforeSection = pageText.match(/Movimientos antes de[\s\S]*/);
  if (beforeSection) {
    const beforeLines = beforeSection[0].split("\n");
    for (const line of beforeLines) {
      const trimmed = line.trim();
      const match = trimmed.match(simpleRegex);
      if (match) {
        const [, desc, dateStr, amountStr, installmentStr, pendingStr] = match;
        const description = desc.replace(/\d{6,}\s*$/, "").trim();
        const amount = parseColCurrency(amountStr);

        // Check if already added
        const exists = movements.some(m => m.date === formatDate(dateStr) && m.description === description);
        if (!exists) {
          movements.push({
            date: formatDate(dateStr),
            description,
            amount,
            installmentAmount: parseColCurrency(installmentStr),
            pendingBalance: parseColCurrency(pendingStr),
          });
        }
      }
    }
  }

  return movements;
}

function detectCardType(text: string, lastDigits: string): string {
  if (text.includes("AMEX") || text.includes("American Express")) return "AMEX";
  if (text.includes("VISA")) return "VISA";
  if (text.includes("Mastercard") || text.includes("MASTERCARD")) return "Mastercard";
  // Infer from card number patterns
  if (lastDigits === "1246") return "AMEX";
  if (lastDigits === "0790") return "VISA";
  return "Otro";
}

function parseColCurrency(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/\s/g, "");
  // Colombian: dots as thousands, comma as decimal (e.g., "28.245,00")
  if (cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  // USD-like or just numbers
  if (cleaned.includes(",") && !cleaned.includes(".")) {
    return parseFloat(cleaned.replace(/,/g, ""));
  }
  return parseFloat(cleaned.replace(/,/g, ""));
}

function parseSpanishDate(str: string): string {
  const months: Record<string, string> = {
    ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
    jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
  };

  // "15 jun. 2026" or "jul. 02, 2026" or "18 may 2026"
  const match1 = str.match(/(\d{1,2})\s+(\w{3})\.?\s+(\d{4})/);
  if (match1) {
    const month = months[match1[2].toLowerCase()] || "01";
    return `${match1[3]}-${month}-${match1[1].padStart(2, "0")}`;
  }

  const match2 = str.match(/(\w{3})\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (match2) {
    const month = months[match2[1].toLowerCase()] || "01";
    return `${match2[3]}-${month}-${match2[2].padStart(2, "0")}`;
  }

  return "";
}

function formatDate(dateStr: string): string {
  // "15/06/2026" → "2026-06-15"
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}
