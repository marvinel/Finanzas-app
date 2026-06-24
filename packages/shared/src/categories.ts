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
  // Subscriptions
  { keywords: ["NETFLIX"], category: "subscriptions", subcategory: "Netflix" },
  { keywords: ["SPOTIFY"], category: "subscriptions", subcategory: "Spotify" },
  { keywords: ["DISNEY PLUS", "DISNEY+"], category: "subscriptions", subcategory: "Disney+" },
  { keywords: ["PRIME VIDE", "PRIME VIDEO"], category: "subscriptions", subcategory: "Prime Video" },
  { keywords: ["SMARTFIT"], category: "fitness", subcategory: "SmartFit" },
  { keywords: ["APPLE.COM BILL", "APPLE.COM"], category: "subscriptions", subcategory: "Apple" },

  // Food delivery
  { keywords: ["RAPPI"], category: "food_delivery", subcategory: "Rappi" },
  { keywords: ["IFOOD"], category: "food_delivery", subcategory: "iFood" },

  // Restaurants
  { keywords: ["SUBWAY"], category: "restaurants", subcategory: "Subway" },
  { keywords: ["PAPA JOHN"], category: "restaurants", subcategory: "Papa Johns" },
  { keywords: ["CHALOTE"], category: "restaurants", subcategory: "Chalote" },
  { keywords: ["COSECHAS"], category: "restaurants", subcategory: "Cosechas" },
  { keywords: ["CHUZITOS"], category: "restaurants", subcategory: "Chuzitos" },
  { keywords: ["DOMIORIENT"], category: "restaurants", subcategory: "Domioriente" },
  { keywords: ["COLLAGE"], category: "restaurants", subcategory: "Collage" },
  { keywords: ["OXXO"], category: "restaurants", subcategory: "Oxxo" },

  // Groceries
  { keywords: ["SUPERTIEND"], category: "groceries", subcategory: "Supertiendas" },
  { keywords: ["TIENDAS AR", "TIENDA AR"], category: "groceries", subcategory: "Tiendas Ara" },
  { keywords: ["TIENDA D1", "D1 "], category: "groceries", subcategory: "D1" },
  { keywords: ["DOLLARCITY"], category: "groceries", subcategory: "Dollarcity" },
  { keywords: ["EXPRESO BR"], category: "groceries" },

  // Entertainment
  { keywords: ["CENTRO COL"], category: "entertainment" },
  { keywords: ["GAMERMANIA", "COMPU GAMER"], category: "entertainment", subcategory: "Gaming" },

  // Services / Bills
  { keywords: ["GASES DEL CARIBE", "Gases del Caribe"], category: "services", subcategory: "Gas" },
  { keywords: ["UNE", "EPM"], category: "services", subcategory: "Internet/TV" },
  { keywords: ["PEXTO"], category: "services", subcategory: "Pexto" },
  { keywords: ["VALIDDA", "Validda"], category: "services", subcategory: "Validda" },
  { keywords: ["FIDUCIARIA BANCOL", "FIDEICOMISOS"], category: "services", subcategory: "Fiduciaria" },
  { keywords: ["FUNDACION"], category: "services" },
  { keywords: ["DLOCAL"], category: "services" },
  { keywords: ["VUE TESTING"], category: "services", subcategory: "Vue Testing" },

  // Credit card payments
  { keywords: ["PAGO SUC VIRT TC", "TC VISA", "TC AMEX"], category: "credit_card_payment" },

  // Transfers
  { keywords: ["TRANSFERENCIAS A NEQUI", "TRANSF QR NEQUI"], category: "transfers", subcategory: "Nequi" },
  { keywords: ["TRANSFERENCIA CTA", "TRANSF A ", "TRANSF DE ", "TRANSF QR "], category: "transfers" },
  { keywords: ["PAGO DE NOMI"], category: "income", subcategory: "Nómina" },

  // Cash
  { keywords: ["RETIRO CAJERO", "RETIRO CORRESPONSAL"], category: "cash_withdrawal" },

  // Taxes
  { keywords: ["IMPTO GOBIERNO", "4X1000", "4x1000"], category: "taxes" },

  // Income
  { keywords: ["ABONO INTERESES"], category: "income", subcategory: "Intereses" },

  // Transport
  { keywords: ["EDS ", "GASOLINA", "TERPEL", "PRIMAX"], category: "transport", subcategory: "Gasolina" },

  // Fitness (if not caught by subscription)
  { keywords: ["BODY SHOP"], category: "fitness" },
  { keywords: ["CAPITAL BARBE"], category: "other", subcategory: "Barbería" },
  { keywords: ["TIENDA ADI"], category: "other", subcategory: "Adidas" },
];

/**
 * Known subscriptions for detection (approximate amounts allow for price changes)
 */
export const KNOWN_SUBSCRIPTIONS = [
  { name: "SmartFit", keyword: "SMARTFIT", expectedAmount: -99900 },
  { name: "Netflix", keyword: "NETFLIX", expectedAmount: -44900 },
  { name: "Spotify", keyword: "SPOTIFY", expectedAmount: -18500 },
  { name: "Disney+", keyword: "DISNEY PLUS", expectedAmount: -50000 },
  { name: "Prime Video", keyword: "PRIME VIDE", expectedAmount: -29900 },
  { name: "Apple", keyword: "APPLE.COM", expectedAmount: -11000 },
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
  food_delivery: "Domicilios",
  restaurants: "Restaurantes",
  groceries: "Supermercado",
  subscriptions: "Suscripciones",
  entertainment: "Entretenimiento",
  transport: "Transporte",
  fitness: "Fitness",
  transfers: "Transferencias",
  services: "Servicios",
  credit_card_payment: "Pago Tarjetas",
  cash_withdrawal: "Retiros",
  taxes: "Impuestos",
  income: "Ingresos",
  other: "Otros",
};
