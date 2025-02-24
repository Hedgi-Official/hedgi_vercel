import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import secondaryRateRouter from './routes/secondary-rate';

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register secondary rate route
  app.use(secondaryRateRouter);

  app.get("/api/hedges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const userHedges = await db.query.hedges.findMany({
      where: eq(hedges.userId, req.user.id),
      orderBy: desc(hedges.createdAt),
    });

    res.json(userHedges);
  });

  app.post("/api/hedges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { baseCurrency, targetCurrency, amount, rate, duration, tradeDirection } = req.body;

    try {
      const [hedge] = await db.insert(hedges).values({
        userId: req.user.id,
        baseCurrency,
        targetCurrency,
        amount,
        rate,
        duration,
        status: "active",
        tradeDirection: tradeDirection || 'buy' // Default to 'buy' if not specified
      }).returning();

      res.json(hedge);
    } catch (error) {
      console.error('Error creating hedge:', error);
      res.status(400).json({ error: "Failed to create hedge" });
    }
  });

  app.delete("/api/hedges/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const hedgeId = parseInt(req.params.id);
    if (isNaN(hedgeId)) {
      return res.status(400).send("Invalid hedge ID");
    }

    try {
      const [hedge] = await db
        .delete(hedges)
        .where(eq(hedges.id, hedgeId))
        .returning();

      if (!hedge) {
        return res.status(404).send("Hedge not found");
      }

      res.json({ message: "Hedge deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete hedge" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}