import { Router } from "express";
import { getAuthUrl, saveTokens, isGmailConnected } from "../gmail/auth.js";
import { syncGmailTransactions } from "../gmail/sync.js";

const router = Router();

// GET /api/gmail/status - Check if Gmail is connected
router.get("/status", (_req, res) => {
  res.json({ connected: isGmailConnected() });
});

// GET /api/gmail/connect - Start OAuth flow
router.get("/connect", (_req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// GET /api/gmail/callback - OAuth callback
router.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    res.status(400).send("No authorization code provided");
    return;
  }

  try {
    await saveTokens(code as string);
    // Redirect to frontend with success
    res.redirect("http://localhost:3000?gmail=connected");
  } catch (error: any) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// POST /api/gmail/sync - Sync transactions from Gmail
router.post("/sync", async (req, res) => {
  const { maxResults = 500, afterDate } = req.body;

  try {
    const result = await syncGmailTransactions(maxResults, afterDate);
    res.json(result);
  } catch (error: any) {
    // If token expired or invalid, signal to reconnect
    if (error.message?.includes("invalid_grant") || error.message?.includes("Token")) {
      res.status(401).json({ error: "Gmail token expired", reconnect: true });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export { router as gmailRouter };
