import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Set up authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    next();
  };

  // Get all hedges for the authenticated user
  app.get("/api/hedges", requireAuth, async (req, res) => {
    try {
      const userHedges = await db
        .select()
        .from(hedges)
        .where(eq(hedges.userId, req.user!.id))
        .orderBy(hedges.createdAt);

      res.json(userHedges);
    } catch (error) {
      res.status(500).send("Error fetching hedges");
    }
  });

  // Create a new hedge
  app.post("/api/hedges", requireAuth, async (req, res) => {
    try {
      const { baseCurrency, targetCurrency, amount, startDate, endDate } = req.body;

      if (!baseCurrency || !targetCurrency || !amount || !startDate || !endDate) {
        return res.status(400).send("Missing required fields");
      }

      if (amount <= 0 || amount > 10000) {
        return res.status(400).send("Amount must be between 0 and 10,000");
      }

      const [hedge] = await db
        .insert(hedges)
        .values({
          userId: req.user!.id,
          baseCurrency,
          targetCurrency,
          amount,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "active",
        })
        .returning();

      res.json(hedge);
    } catch (error) {
      res.status(500).send("Error creating hedge");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
