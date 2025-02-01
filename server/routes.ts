import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges, calendarEvents } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUrl, handleOAuthCallback, syncUserCalendar } from "./services/calendar";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

    const { baseCurrency, targetCurrency, amount, rate, duration } = req.body;

    try {
      const [hedge] = await db.insert(hedges).values({
        userId: req.user.id,
        baseCurrency,
        targetCurrency,
        amount,
        rate,
        duration,
        status: "active",
      }).returning();

      res.json(hedge);
    } catch (error) {
      res.status(400).json({ error: "Failed to create hedge" });
    }
  });

  // Calendar routes
  app.get("/api/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const events = await db.query.calendarEvents.findMany({
      where: eq(calendarEvents.userId, req.user.id),
      orderBy: desc(calendarEvents.startDate),
    });

    res.json(events);
  });

  app.get("/api/calendar/auth", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const authUrl = getAuthUrl();
    res.json({ authUrl });
  });

  app.get("/api/calendar/oauth/callback", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const { code, state } = req.query;
    const expectedState = req.session.oauthState;

    // Validate state to prevent CSRF attacks
    if (!state || state !== expectedState) {
      console.error('OAuth state mismatch:', { expected: expectedState, received: state });
      return res.status(400).send("Invalid OAuth state");
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).send("Invalid code");
    }

    try {
      await handleOAuthCallback(code, req.user.id);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send("Failed to complete Google Calendar authentication");
    }
  });

  app.post("/api/calendar/sync", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const eventCount = await syncUserCalendar(req.user.id);
      res.json({ message: `Synced ${eventCount} events` });
    } catch (error) {
      console.error('Calendar sync error:', error);
      res.status(500).send("Failed to sync calendar");
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