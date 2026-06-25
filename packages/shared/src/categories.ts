import { TransactionCategory } from "./types";

interface CategoryRule {
  keywords: string[];
  category: TransactionCategory;
  subcategory?: string;
}

/**
 * Rules for auto-categorizing transactions based on description keywords.
 * Order matters — first match wins.
 */
export const CATEGORY_RULES: CategoryRule[] = [
  // Subscriptions (streaming, gym, apps)
  { keywords: ["NETFLIX"], category: "subscriptions", subcategory: "Netflix" },
  { keywords: ["SPOTIFY"], category: "subscriptions", subcategory: "Spotify" },
  { keywords: ["DISNEY PLUS", "DISNEY+"], category: "subscriptions", subcategory: "Disney+" },
  { keywords: ["PRIME VIDE", "PRIME VIDEO"], category: "subscriptions", subcategory: "Prime Video" },
  { keywords: ["SMARTFIT"], category: "subscriptions", subcategory: "SmartFit" },
  { keywords: ["APPLE.COM BILL", "APPLE.COM"], category: "subscriptions", subcategory: "Apple" },
  { keywords: ["VUE TESTING"], category: "subscriptions", subcategory: "Vue Testing" },

  // Food (delivery + restaurants)
  { keywords: ["RAPPI"], category: "food", subcategory: "Rappi" },
  { keywords: ["IFOOD"], category: "food", subcategory: "iFood" },
  { keywords: ["SUBWAY"], category: "food", subcategory: "Subway" },
  { keywords: ["PAPA JOHN"], category: "food", subcategory: "Papa Johns" },
  { keywords: ["CHALOTE"], category: "food", subcategory: "Chalote" },
  { keywords: ["COSECHAS"], category: "food", subcategory: "Cosechas" },
  { keywords: ["CHUZITOS"], category: "food", subcategory: "Chuzitos" },
  { keywords: ["DOMIORIENT"], category: "food", subcategory: "Domioriente" },
  { keywords: ["COLLAGE"], category: "food", subcategory: "Collage" },
  { keywords: ["OXXO"], category: "food", subcategory: "Oxxo" },

  // Groceries (supermarkets)
  { keywords: ["SUPERTIEND"], category: "groceries", subcategory: "Supertiendas" },
  { keywords: ["TIENDAS AR", "TIENDA AR"], category: "groceries", subcategory: "Tiendas Ara" },
  { keywords: ["TIENDA D1", "D1 "], category: "groceries", subcategory: "D1" },
  { keywords: ["DOLLARCITY"], category: "groceries", subcategory: "Dollarcity" },
  { keywords: ["EXPRESO BR"], category: "groceries" },
  { keywords: ["MERCADO PA"], category: "groceries", subcategory: "Mercado" },

  // Services (bills, utilities, payments)
  { keywords: ["GASES DEL CARIBE", "Gases del Caribe"], category: "home", subcategory: "Gas" },
  { keywords: ["UNE", "EPM"], category: "home", subcategory: "Internet/TV" },
  { keywords: ["PEXTO"], category: "home", subcategory: "Pexto" },
  { keywords: ["VALIDDA", "Validda"], category: "home", subcategory: "Validda" },
  { keywords: ["FIDUCIARIA BANCOL", "FIDEICOMISOS"], category: "services", subcategory: "Fiduciaria" },
  { keywords: ["FUNDACION"], category: "services" },
  { keywords: ["DLOCAL"], category: "services" },
  { keywords: ["GLOBAL COLOMBIA"], category: "services" },
  { keywords: ["CENTRO COL"], category: "services", subcategory: "Centro Comercial" },
  { keywords: ["IMPTO GOBIERNO", "4X1000", "4x1000"], category: "services", subcategory: "4x1000" },
  { keywords: ["EDS ", "GASOLINA"], category: "transport", subcategory: "Gasolina" },
  { keywords: ["CAPITAL BARBE"], category: "services", subcategory: "Barbería" },
  { keywords: ["BODY SHOP"], category: "services" },
  { keywords: ["TIENDA ADI"], category: "services", subcategory: "Adidas" },
  { keywords: ["COMPU GAMER", "GAMERMANIA"], category: "services", subcategory: "Gaming" },
  { keywords: ["MYC TECHNOLOG"], category: "services" },

  // Credit card payments
  { keywords: ["PAGO SUC VIRT TC", "TC VISA", "TC AMEX"], category: "credit_card_payment" },

  // Transfers
  { keywords: ["TRANSFERENCIAS A NEQUI", "TRANSF QR NEQUI"], category: "transfers", subcategory: "Nequi" },
  { keywords: ["TRANSFERENCIA CTA", "TRANSF A ", "TRANSF DE ", "TRANSF QR "], category: "transfers" },
  { keywords: ["PAGO DE NOMI"], category: "income", subcategory: "Nómina" },
  { keywords: ["PAGO QR"], category: "transfers" },
  { keywords: ["PAGO PSE"], category: "services" },

  // Cash withdrawals
  { keywords: ["RETIRO CAJERO", "RETIRO CORRESPONSAL"], category: "cash_withdrawal" },

  // Income
  { keywords: ["ABONO INTERESES"], category: "income", subcategory: "Intereses" },
];

/**
 * Known subscriptions for detection
 */
export const KNOWN_SUBSCRIPTIONS = [
  { name: "SmartFit", keyword: "SMARTFIT", expectedAmount: -99900 },
  { name: "Netflix", keyword: "NETFLIX", expectedAmount: -44900 },
  { name: "Spotify", keyword: "SPOTIFY", expectedAmount: -18500 },
  { name: "Disney+", keyword: "DISNEY PLUS", expectedAmount: -50000 },
  { name: "Prime Video", keyword: "PRIME VIDE", expectedAmount: -29900 },
  { name: "Apple", keyword: "APPLE.COM", expectedAmount: -11000 },
  { name: "Vue Testing", keyword: "VUE TESTING", expectedAmount: -189000 },
];

/**
 * Categorize a transaction based on its description
 */
export function categorizeTransaction(description: string): {
  category: TransactionCategory;
  subcategory?: string;
} {
  const upper = description.toUpperCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => upper.includes(kw.toUpperCase()))) {
      return { category: rule.category, subcategory: rule.subcategory };
    }
  }

  return { category: "other" };
}

/**
 * Determine if a transaction is likely a subscription
 */
export function isLikelySubscription(description: string): boolean {
  const upper = description.toUpperCase();
  return KNOWN_SUBSCRIPTIONS.some((sub) =>
    upper.includes(sub.keyword.toUpperCase())
  );
}

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  transfers: "Transferencias",
  credit_card_payment: "Pago Tarjetas",
  cash_withdrawal: "Retiros",
  food: "Comida",
  groceries: "Supermercado",
  subscriptions: "Suscripciones",
  services: "Servicios",
  home: "Hogar",
  transport: "Transporte",
  income: "Ingresos",
  other: "Otros",
};
