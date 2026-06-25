const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function uploadStatement(file: File, password?: string) {
  const formData = new FormData();
  formData.append("statement", file);
  if (password) formData.append("password", password);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Upload failed");
  }

  return res.json();
}

export async function getTransactions(params?: {
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const res = await fetch(`${API_URL}/api/transactions?${searchParams}`);
  return res.json();
}

export async function getMonthlySummary() {
  const res = await fetch(`${API_URL}/api/summary/monthly`);
  return res.json();
}

export async function getCategorySummary(startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  const res = await fetch(`${API_URL}/api/summary/categories?${params}`);
  return res.json();
}

export async function getTopMerchants(limit = 10) {
  const res = await fetch(`${API_URL}/api/summary/top-merchants?limit=${limit}`);
  return res.json();
}

export async function getSubscriptions() {
  const res = await fetch(`${API_URL}/api/subscriptions`);
  return res.json();
}

export async function getSubscriptionHistory(name: string) {
  const res = await fetch(`${API_URL}/api/subscriptions/${encodeURIComponent(name)}/history`);
  return res.json();
}

export async function getGmailStatus() {
  const res = await fetch(`${API_URL}/api/gmail/status`);
  return res.json();
}

export async function syncGmail() {
  const res = await fetch(`${API_URL}/api/gmail/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxResults: 500 }),
  });
  return res.json();
}

export function getGmailConnectUrl() {
  return `${API_URL}/api/gmail/connect`;
}

export async function updateTransactionCategory(
  id: number,
  category: string,
  subcategory?: string
) {
  const res = await fetch(`${API_URL}/api/transactions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, subcategory }),
  });
  return res.json();
}

export async function getBalance() {
  const res = await fetch(`${API_URL}/api/summary/balance`);
  return res.json();
}

export async function setBalance(balance: number) {
  const res = await fetch(`${API_URL}/api/summary/balance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ balance }),
  });
  return res.json();
}
