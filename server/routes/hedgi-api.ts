import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { db } from "@db";
import { users, hiddenClosedOrders } from "@db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

const HEDGI_API_BASE = "https://api.hedgi.ai";

async function getApiKeyForUser(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ apiKey: users.apiKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.apiKey || null;
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.isAuthenticated() || !req.user?.id) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

router.post("/api/hedgi/quotes/simulate", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Simulating quote for user:", userId);
    console.log("[Hedgi API] Request body:", JSON.stringify(req.body));

    const response = await fetch(`${HEDGI_API_BASE}/api/quotes/simulate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log("[Hedgi API] Simulate response:", response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Simulate error:", error);
    return res.status(500).json({ error: error.message || "Failed to simulate quote" });
  }
});

router.post("/api/hedgi/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Creating order for user:", userId);
    console.log("[Hedgi API] Request body:", JSON.stringify(req.body));

    const response = await fetch(`${HEDGI_API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    console.log("[Hedgi API] Create order response:", response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Create order error:", error);
    return res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

router.get("/api/hedgi/orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Fetching orders for user:", userId);

    const queryParams = new URLSearchParams();
    if (req.query.status) queryParams.set("status", req.query.status as string);
    if (req.query.limit) queryParams.set("limit", req.query.limit as string);
    if (req.query.offset) queryParams.set("offset", req.query.offset as string);

    const url = `${HEDGI_API_BASE}/api/orders${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as any;
    console.log("[Hedgi API] Orders response:", response.status);

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const normalizedData = Array.isArray(data) ? { orders: data } : (data.orders ? data : { orders: [] });
    
    // Note: Removed per-order enrichment API calls to reduce load on api.hedgi.ai
    // The main orders endpoint should return sufficient data for the dashboard
    // Individual order details can be fetched on-demand when user clicks on an order
    
    return res.json(normalizedData);
  } catch (error: any) {
    console.error("[Hedgi API] Fetch orders error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch orders", orders: [] });
  }
});

router.get("/api/hedgi/orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Fetching order:", orderId, "for user:", userId);

    const response = await fetch(`${HEDGI_API_BASE}/api/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("[Hedgi API] Order details response:", response.status);

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Fetch order error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch order" });
  }
});

// Close an OPEN order (POST /api/orders/:id/close)
router.post("/api/hedgi/orders/:id/close", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Closing OPEN order:", orderId, "for user:", userId);

    const response = await fetch(`${HEDGI_API_BASE}/api/orders/${orderId}/close`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("[Hedgi API] Close order response:", response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Close order error:", error);
    return res.status(500).json({ error: error.message || "Failed to close order" });
  }
});

// Cancel a PENDING order (DELETE /api/orders/:id)
router.delete("/api/hedgi/orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Cancelling PENDING order:", orderId, "for user:", userId);

    const response = await fetch(`${HEDGI_API_BASE}/api/orders/${orderId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("[Hedgi API] Cancel order response:", response.status, JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Cancel order error:", error);
    return res.status(500).json({ error: error.message || "Failed to cancel order" });
  }
});

router.get("/api/hedgi/health", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${HEDGI_API_BASE}/health`, {
      method: "GET",
    });

    const data = await response.json();
    return res.json(data);
  } catch (error: any) {
    console.error("[Hedgi API] Health check error:", error);
    return res.status(500).json({ error: error.message || "Health check failed" });
  }
});

router.get("/api/hedgi/hidden-orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const hidden = await db.query.hiddenClosedOrders.findMany({
      where: eq(hiddenClosedOrders.userId, userId),
    });
    return res.json({ orderIds: hidden.map(h => h.orderId) });
  } catch (error: any) {
    console.error("[Hedgi API] Get hidden orders error:", error);
    return res.status(500).json({ error: error.message || "Failed to get hidden orders" });
  }
});

router.post("/api/hedgi/hidden-orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const existing = await db.query.hiddenClosedOrders.findFirst({
      where: and(eq(hiddenClosedOrders.userId, userId), eq(hiddenClosedOrders.orderId, orderId)),
    });

    if (existing) {
      return res.json({ success: true, message: "Already hidden" });
    }

    await db.insert(hiddenClosedOrders).values({
      userId,
      orderId: String(orderId),
    });

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[Hedgi API] Hide order error:", error);
    return res.status(500).json({ error: error.message || "Failed to hide order" });
  }
});

router.delete("/api/hedgi/hidden-orders/:orderId", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.orderId;

    await db.delete(hiddenClosedOrders)
      .where(and(eq(hiddenClosedOrders.userId, userId), eq(hiddenClosedOrders.orderId, orderId)));

    return res.json({ success: true });
  } catch (error: any) {
    console.error("[Hedgi API] Unhide order error:", error);
    return res.status(500).json({ error: error.message || "Failed to unhide order" });
  }
});

export default router;
