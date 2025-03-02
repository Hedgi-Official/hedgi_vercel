import type { Express } from "express";
import { createServer, type Server } from "http";
import { log } from "./vite";

export function registerRoutes(app: Express): Server {
  // Temporarily simplified routes for testing startup
  log("Registering minimal routes for startup testing");

  app.get('/api/test', (req, res) => {
    log('Test endpoint called');
    res.json({ status: 'ok' });
  });

  const httpServer = createServer(app);
  return httpServer;
}