import express from "express";
import cors from "cors";
import { uploadRouter } from "./routes/upload.js";
import { transactionsRouter } from "./routes/transactions.js";
import { summaryRouter } from "./routes/summary.js";
import { subscriptionsRouter } from "./routes/subscriptions.js";
import { initDatabase } from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.use("/api/upload", uploadRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/summary", summaryRouter);
app.use("/api/subscriptions", subscriptionsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
