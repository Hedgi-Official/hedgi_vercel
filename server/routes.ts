import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { hedges } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { spawn } from "child_process";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  // Start MT5 service
  const mt5Service = spawn("python3", [path.join(__dirname, "mt5_service.py")], {
    stdio: "inherit",
  });

  mt5Service.on("error", (err) => {
    console.error("Failed to start MT5 service:", err);
  });

  process.on("exit", () => {
    mt5Service.kill();
  });

  // API Routes
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

  // Handle WebSocket upgrade requests
  httpServer.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === '/ws') {
      if (request.headers['sec-websocket-protocol'] === 'vite-hmr') {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Forward WebSocket messages to/from MT5 service
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    const mt5Ws = new WebSocket('ws://localhost:6789');

    mt5Ws.on('message', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.toString());
      }
    });

    mt5Ws.on('error', (error) => {
      console.error('MT5 WebSocket error:', error);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    ws.on('close', () => {
      mt5Ws.close();
    });
  });

  return httpServer;
}