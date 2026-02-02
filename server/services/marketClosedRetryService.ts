import { db } from "../../db";
import { pendingOrders, users } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import fetch from "node-fetch";

const HEDGI_API_BASE = "https://api.hedgi.ai";
const RETRY_INTERVAL_MS = 10 * 60 * 1000;

async function getApiKeyForUser(userId: number): Promise<string | null> {
  const [user] = await db
    .select({ apiKey: users.apiKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.apiKey || null;
}

async function checkMarketStatus(symbol: string, apiKey: string): Promise<boolean> {
  try {
    const base = symbol.slice(0, 3);
    const target = symbol.slice(3, 6);
    
    const response = await fetch(`${HEDGI_API_BASE}/api/quotes/simulate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol,
        base_currency: base,
        target_currency: target,
        volume: 0.01,
        direction: "buy",
        duration_days: 1,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errorCode = data.code || data.error_code || "";
      const errorMessage = data.message || data.error || "";
      if (errorCode === "MARKET_CLOSED" || 
          (errorMessage.toLowerCase().includes("market") && errorMessage.toLowerCase().includes("closed"))) {
        console.log(`[MarketClosedRetry] Market closed (error response) for ${symbol}`);
        return false;
      }
    }
    
    if (response.ok && data.brokers && Array.isArray(data.brokers) && data.brokers.length > 0) {
      const hasOpenBroker = data.brokers.some((b: any) => b.market_open === true);
      if (!hasOpenBroker) {
        console.log(`[MarketClosedRetry] All brokers have market_open=false for ${symbol}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error(`[MarketClosedRetry] Error checking market for ${symbol}:`, error);
    return true;
  }
}

async function executeOrder(order: any, apiKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${HEDGI_API_BASE}/api/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        symbol: order.symbol,
        direction: order.direction,
        volume: parseFloat(order.volume),
        duration_days: order.durationDays,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = (data as any).detail || (data as any).message || (data as any).error || "Order failed";
      return { success: false, data, error: errorMessage };
    }
    
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || "Network error" };
  }
}

async function processMarketClosedOrders(): Promise<void> {
  console.log("[MarketClosedRetry] Starting retry cycle...");
  
  try {
    const marketClosedOrders = await db.query.pendingOrders.findMany({
      where: eq(pendingOrders.status, "market_closed"),
    });

    if (marketClosedOrders.length === 0) {
      console.log("[MarketClosedRetry] No market_closed orders to process");
      return;
    }

    console.log(`[MarketClosedRetry] Found ${marketClosedOrders.length} orders to retry`);

    const ordersByUser = new Map<number, typeof marketClosedOrders>();
    for (const order of marketClosedOrders) {
      const existing = ordersByUser.get(order.userId) || [];
      existing.push(order);
      ordersByUser.set(order.userId, existing);
    }

    for (const [userId, userOrders] of Array.from(ordersByUser.entries())) {
      const apiKey = await getApiKeyForUser(userId);
      if (!apiKey) {
        console.log(`[MarketClosedRetry] No API key for user ${userId}, marking ${userOrders.length} orders as failed`);
        for (const order of userOrders) {
          await db
            .update(pendingOrders)
            .set({
              status: "failed",
              resultError: "No API key configured for this account. Please add your Hedgi API key in settings.",
            })
            .where(eq(pendingOrders.id, order.id));
        }
        continue;
      }

      for (const order of userOrders) {
        const isOpen = await checkMarketStatus(order.symbol, apiKey);
        
        if (!isOpen) {
          console.log(`[MarketClosedRetry] Market still closed for ${order.symbol}, will retry later`);
          continue;
        }

        console.log(`[MarketClosedRetry] Market open for ${order.symbol}, attempting execution...`);
        const result = await executeOrder(order, apiKey);

        if (result.success) {
          await db
            .update(pendingOrders)
            .set({
              status: "completed",
              executedAt: new Date(),
              resultOrderId: (result.data as any)?.id || (result.data as any)?.order_id || null,
            })
            .where(eq(pendingOrders.id, order.id));
          console.log(`[MarketClosedRetry] Order ${order.id} executed successfully`);
        } else {
          const errorCode = (result.data as any)?.code || (result.data as any)?.error_code || "";
          const errorMessage = result.error || "";
          
          if (errorCode === "MARKET_CLOSED" || 
              (errorMessage.toLowerCase().includes("market") && errorMessage.toLowerCase().includes("closed"))) {
            console.log(`[MarketClosedRetry] Market closed during execution for ${order.symbol}`);
          } else {
            await db
              .update(pendingOrders)
              .set({
                status: "failed",
                resultError: `[${errorCode}] ${errorMessage}`,
              })
              .where(eq(pendingOrders.id, order.id));
            console.log(`[MarketClosedRetry] Order ${order.id} failed: ${errorMessage}`);
          }
        }
      }
    }

    console.log("[MarketClosedRetry] Retry cycle complete");
  } catch (error) {
    console.error("[MarketClosedRetry] Error processing orders:", error);
  }
}

let retryInterval: NodeJS.Timeout | null = null;

export function startMarketClosedRetryService(): void {
  if (retryInterval) {
    console.log("[MarketClosedRetry] Service already running");
    return;
  }

  console.log(`[MarketClosedRetry] Starting service with ${RETRY_INTERVAL_MS / 1000 / 60} minute interval`);
  
  processMarketClosedOrders();
  
  retryInterval = setInterval(() => {
    processMarketClosedOrders();
  }, RETRY_INTERVAL_MS);
}

export function stopMarketClosedRetryService(): void {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
    console.log("[MarketClosedRetry] Service stopped");
  }
}
