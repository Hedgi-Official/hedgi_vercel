import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

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

router.delete("/api/hedgi/orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.id;
    const apiKey = await getApiKeyForUser(userId);
    
    if (!apiKey) {
      return res.status(403).json({ error: "No API key configured for this account" });
    }

    console.log("[Hedgi API] Closing order:", orderId, "for user:", userId);

    const response = await fetch(`${HEDGI_API_BASE}/api/orders/${orderId}`, {
      method: "DELETE",
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

export default router;
