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

    // Parse movements from next page(s)
    const movements: CreditCardMovement[] = [];
    // Look ahead for movements page matching this currency
    for (let j = i + 1; j < pages.length; j++) {
      const movPage = pages[j];
      const currLabel = currency === "USD" ? "DOLARES" : "PESOS";
      if (movPage.includes("Detalles del movimiento") && movPage.includes(currLabel)) {
        const movs = parseMovements(movPage, currency);
        movements.push(...movs);
        if (j === i + 1) i++; // skip if it's the immediate next page
        break;
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes("DCF:") || trimmed.includes("Número de") || 
        trimmed.includes("autorización") || trimmed.includes("cuotas") ||
        trimmed.includes("Couta/Abono") || trimmed.includes("mensual") ||
        trimmed.includes("anual") || trimmed.includes("pendiente") ||
        trimmed.includes("Movimientos") || trimmed.includes("Detalles") ||
        trimmed.includes("Recuerda") || trimmed.includes("débitos") ||
        trimmed.includes("Tarjeta:") || trimmed.includes("NIT:") ||
        trimmed.includes("movimiento")) continue;

    // Full format with installments and interest:
    // "AMAZON.COM*WC54A94F3279984 31/12/2025 $ 561,80 6/36 $ 15,61 1,8311 % 24,3269 % $ 468,14"
    const fullRegex = /^(.+?)(\d{2}\/\d{2}\/\d{4})\s+\$\s*(-?[\d.,]+)\s+(\d+\/\d+)\s+\$\s*(-?[\d.,]+)\s+([\d.,]+)\s*%\s*([\d.,]+)\s*%\s*\$\s*([\d.,]+)/;
    const fullMatch = trimmed.match(fullRegex);
    if (fullMatch) {
      const [, desc, dateStr, amountStr, installments, installmentStr, intMonth, intAnnual, pendingStr] = fullMatch;
      const description = desc.replace(/\d{6,}\s*$/, "").trim();
      movements.push({
        date: formatDate(dateStr),
        description,
        amount: parseColCurrency(amountStr),
        installments,
        installmentAmount: parseColCurrency(installmentStr),
        interestMonthly: parseFloat(intMonth.replace(",", ".")),
        interestAnnual: parseFloat(intAnnual.replace(",", ".")),
        pendingBalance: parseColCurrency(pendingStr),
      });
      continue;
    }

    // Simple format without installments:
    // "CUOTA DE MANEJO000000 15/06/2026 $ 28.245,00 $ 28.245,00 $ 0,00"
    // "ABONO DEBITO AUTOMATICO981524 02/06/2026 $ -245.786,00 $ -245.786,00 $ 0,00"
    const simpleRegex = /^(.+?)(\d{2}\/\d{2}\/\d{4})\s+\$\s*(-?[\d.,]+)\s+\$\s*(-?[\d.,]+)\s+\$\s*([\d.,]+)/;
    const simpleMatch = trimmed.match(simpleRegex);
    if (simpleMatch) {
      const [, desc, dateStr, amountStr, installmentStr, pendingStr] = simpleMatch;
      const description = desc.replace(/\d{6,}\s*$/, "").trim();
      const amount = parseColCurrency(amountStr);
      const isCredit = description.includes("ABONO") || amountStr.includes("-");

      movements.push({
        date: formatDate(dateStr),
        description,
        amount: isCredit ? -Math.abs(amount) : amount,
        installmentAmount: parseColCurrency(installmentStr),
        pendingBalance: parseColCurrency(pendingStr),
      });
      continue;
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
