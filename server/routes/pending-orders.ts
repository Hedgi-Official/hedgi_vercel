import { Router, Request, Response } from "express";
import { db } from "../../db";
import { pendingOrders } from "../../db/schema";
import { eq, and, lte, desc } from "drizzle-orm";

const router = Router();

const requireAuth = (req: Request, res: Response, next: () => void) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

router.get("/api/pending-orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orders = await db.query.pendingOrders.findMany({
      where: eq(pendingOrders.userId, userId),
      orderBy: [desc(pendingOrders.createdAt)],
    });
    return res.json({ orders });
  } catch (error: any) {
    console.error("[Pending Orders] Fetch error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch pending orders" });
  }
});

function parseDateDDMMYYYY(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  const match = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2100) {
      return new Date(year, month, day);
    }
  }
  return null;
}

router.post("/api/pending-orders", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { symbol, direction, volume, duration_days, execute_at, payment_date, client_ref, batch_id, metadata } = req.body;
    
    if (!symbol || !direction || !volume || !execute_at) {
      return res.status(400).json({ error: "Missing required fields: symbol, direction, volume, execute_at" });
    }

    let paymentDateValue: Date | null = null;
    if (payment_date) {
      paymentDateValue = parseDateDDMMYYYY(payment_date);
    }

    const [order] = await db.insert(pendingOrders).values({
      userId,
      symbol: symbol.toUpperCase(),
      direction: direction.toLowerCase(),
      volume: volume.toString(),
      durationDays: duration_days || 0,
      executeAt: new Date(execute_at),
      paymentDate: paymentDateValue,
      clientRef: client_ref || null,
      batchId: batch_id || null,
      metadata: metadata || {},
      status: "pending",
    }).returning();

    return res.json(order);
  } catch (error: any) {
    console.error("[Pending Orders] Create error:", error);
    return res.status(500).json({ error: error.message || "Failed to create pending order" });
  }
});

router.post("/api/pending-orders/batch", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { orders: ordersList, batch_id } = req.body;
    
    if (!Array.isArray(ordersList) || ordersList.length === 0) {
      return res.status(400).json({ error: "Orders array is required" });
    }

    const batchIdToUse = batch_id || `batch_${Date.now()}`;
    
    const ordersToInsert = ordersList.map((o: any) => {
      let paymentDateValue: Date | null = null;
      if (o.payment_date) {
        paymentDateValue = parseDateDDMMYYYY(o.payment_date);
      }
      
      return {
        userId,
        symbol: o.symbol?.toUpperCase() || "",
        direction: o.direction?.toLowerCase() || "buy",
        volume: (o.volume || 0).toString(),
        durationDays: o.duration_days || 0,
        executeAt: new Date(o.execute_at || Date.now()),
        paymentDate: paymentDateValue,
        clientRef: o.client_ref || null,
        batchId: batchIdToUse,
        metadata: o.metadata || {},
        status: "pending" as const,
      };
    });

    const insertedOrders = await db.insert(pendingOrders).values(ordersToInsert).returning();
    
    return res.json({ 
      batch_id: batchIdToUse, 
      count: insertedOrders.length,
      orders: insertedOrders 
    });
  } catch (error: any) {
    console.error("[Pending Orders] Batch create error:", error);
    return res.status(500).json({ error: error.message || "Failed to create batch orders" });
  }
});

router.patch("/api/pending-orders/:id/cancel", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id);

    const [updated] = await db
      .update(pendingOrders)
      .set({ status: "cancelled" })
      .where(and(eq(pendingOrders.id, orderId), eq(pendingOrders.userId, userId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error("[Pending Orders] Cancel error:", error);
    return res.status(500).json({ error: error.message || "Failed to cancel order" });
  }
});

router.delete("/api/pending-orders/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const orderId = parseInt(req.params.id);

    const [deleted] = await db
      .delete(pendingOrders)
      .where(and(eq(pendingOrders.id, orderId), eq(pendingOrders.userId, userId), eq(pendingOrders.status, "pending")))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Pending order not found or already executed" });
    }

    return res.json({ success: true, deleted: deleted });
  } catch (error: any) {
    console.error("[Pending Orders] Delete error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete order" });
  }
});

export default router;
