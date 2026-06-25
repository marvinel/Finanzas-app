import { Transaction } from "@finanzas/shared";
import { categorizeTransaction, isLikelySubscription } from "@finanzas/shared";

/**
 * Parse a Bancolombia notification email body into a transaction.
 * 
 * Known formats:
 * - "Bancolombia: Compraste $6.770,00 en SUPERTIENDA OLIMPICA con tu T.Deb *6379, el 25/06/2026 a las 09:09."
 * - "Bancolombia: Transferiste $50.000,00 desde tu Cta Ahorros *1355 a NEQUI el 25/06/2026 a las 10:30."
 * - "Bancolombia: Recibiste $2.166.792,00 en tu Cta Ahorros *1355 de SUPERTIENDAS Y ... el 14/01/2026 a las 06:00."
 * - "Bancolombia: Retiraste $100.000,00 en cajero desde tu Cta Ahorros *1355 el 25/06/2026 a las 14:00."
 * - "Bancolombia: Pagaste $99.900,00 a SMARTFIT desde tu Cta Ahorros *1355 el 02/01/2026 a las 01:00."
 */
export function parseEmailBody(body: string): Transaction | null {
  // Clean up the text (remove HTML, extra spaces, line breaks)
  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

  // Find the Bancolombia notification text
  const bancoMatch = text.match(/Bancolombia:\s*(.+?)(?:Si tienes dudas|Estamos cerca|\.\s*(?:Si|Controla|Esto es))/s);
  if (!bancoMatch) return null;

  const notification = bancoMatch[1].trim();

  // Extract amount (format: $6.770,00 or $2.166.792,00 or $18,600)
  const amountMatch = notification.match(/\$([\d.,]+)/);
  if (!amountMatch) return null;

  const amount = parseColAmount(amountMatch[1]);

  // Extract date (format: dd/mm/yyyy)
  const dateMatch = notification.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (!dateMatch) return null;

  const [day, month, year] = dateMatch[1].split("/");
  const isoDate = `${year}-${month}-${day}`;

  // Determine type and description
  let description = "";
  let finalAmount = 0;

  if (notification.match(/Compraste/i)) {
    // Compra: "Compraste $X en COMERCIO con tu..."
    const descMatch = notification.match(/en\s+(.+?)\s+con tu/i);
    description = descMatch ? `COMPRA EN ${descMatch[1]}` : "COMPRA";
    finalAmount = -amount;
  } else if (notification.match(/Transferiste/i)) {
    // Transferencia saliente
    const descMatch = notification.match(/a\s+(.+?)\s+el\s/i) || notification.match(/desde tu.+?a\s+(.+?)\s+el/i);
    description = descMatch ? `TRANSFERENCIA A ${descMatch[1]}` : "TRANSFERENCIA";
    finalAmount = -amount;
  } else if (notification.match(/Recibiste/i)) {
    // Ingreso
    const descMatch = notification.match(/de\s+(.+?)\s+el\s/i);
    description = descMatch ? `RECIBIDO DE ${descMatch[1]}` : "INGRESO";
    finalAmount = amount;
  } else if (notification.match(/Retiraste/i)) {
    // Retiro cajero
    description = "RETIRO CAJERO";
    finalAmount = -amount;
  } else if (notification.match(/Pagaste/i)) {
    // Pago
    const descMatch = notification.match(/a\s+(.+?)\s+desde/i);
    description = descMatch ? `PAGO ${descMatch[1]}` : "PAGO";
    finalAmount = -amount;
  } else if (notification.match(/Te pagaron/i) || notification.match(/abono/i)) {
    // Ingreso
    const descMatch = notification.match(/de\s+(.+?)\s+el\s/i);
    description = descMatch ? `ABONO DE ${descMatch[1]}` : "ABONO";
    finalAmount = amount;
  } else if (notification.match(/Recibiste un pago/i)) {
    // Pago de nómina u otro ingreso
    const descMatch = notification.match(/pago de\s+(.+?)\s+por\s/i) || notification.match(/de\s+(.+?)\s+por\s/i);
    description = descMatch ? `PAGO DE NOMI ${descMatch[1]}` : "PAGO RECIBIDO";
    finalAmount = amount;
  } else if (notification.match(/Recibiste una transferencia/i)) {
    // Transferencia recibida
    const descMatch = notification.match(/de\s+(.+?)\s+en tu/i);
    description = descMatch ? `TRANSF DE ${descMatch[1]}` : "TRANSFERENCIA RECIBIDA";
    finalAmount = amount;
  } else if (notification.match(/Recibiste/i)) {
    // Ingreso genérico
    const descMatch = notification.match(/de\s+(.+?)\s+el\s/i);
    description = descMatch ? `RECIBIDO DE ${descMatch[1]}` : "INGRESO";
    finalAmount = amount;
  } else {
    // Unknown format, try to infer
    description = notification.substring(0, 40);
    finalAmount = -amount; // Default to expense
  }

  // Categorize
  const { category, subcategory } = categorizeTransaction(description);

  return {
    date: isoDate,
    description: description.toUpperCase().substring(0, 50),
    amount: finalAmount,
    balance: 0, // We don't have balance from emails
    category,
    subcategory,
    isSubscription: isLikelySubscription(description),
  };
}

/**
 * Parse Colombian currency format:
 * - "6.770,00" → 6770 (dots as thousands, comma as decimal)
 * - "18,600" → 18600 (comma as thousands, no decimal)
 * - "2,154,793.00" → 2154793 (commas as thousands, dot as decimal)
 */
function parseColAmount(str: string): number {
  // If it has both dots and comma: "6.770,00" → Colombian format
  if (str.includes(".") && str.includes(",") && str.lastIndexOf(",") > str.lastIndexOf(".")) {
    return parseFloat(str.replace(/\./g, "").replace(",", "."));
  }

  // If it has commas and ends with .XX: "2,154,793.00" → US-like format
  if (str.includes(",") && /\.\d{2}$/.test(str)) {
    return parseFloat(str.replace(/,/g, ""));
  }

  // If it only has comma(s) and no dot: "18,600" → comma as thousands
  if (str.includes(",") && !str.includes(".")) {
    return parseFloat(str.replace(/,/g, ""));
  }

  // If it only has dots: "6.770" → dot as thousands
  if (str.includes(".") && !/\.\d{2}$/.test(str)) {
    return parseFloat(str.replace(/\./g, ""));
  }

  // Default: just parse it
  return parseFloat(str.replace(/,/g, ""));
}
