import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/ping', (req, res) => {
  log('Ping endpoint called');
  res.json({ message: 'pong' });
});

app.get('/_debug/paths', async (_req, res) => {
  const fs = await import('fs');
  const path = await import('path');
  const cwd = process.cwd();
  const distPublic = path.resolve(cwd, 'dist', 'public');
  const distIndex = path.resolve(cwd, 'dist', 'index.js');
  res.json({
    cwd,
    distPublic,
    distPublicExists: fs.existsSync(distPublic),
    distPublicFiles: fs.existsSync(distPublic) ? fs.readdirSync(distPublic).join(', ') : 'N/A',
    distIndexExists: fs.existsSync(distIndex),
    distDir: fs.existsSync(path.resolve(cwd, 'dist')) ? fs.readdirSync(path.resolve(cwd, 'dist')).join(', ') : 'N/A',
    cwdFiles: fs.readdirSync(cwd).slice(0, 30).join(', '),
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// `ready` resolves once routes, static serving, and the error handler are
// installed. Serverless adapters (api/index.ts) MUST `await ready` before
// forwarding the first request, otherwise registerRoutes may not have
// completed and 404s will leak.
let resolveReady!: () => void;
let rejectReady!: (err: unknown) => void;
const ready: Promise<void> = new Promise((resolve, reject) => {
  resolveReady = resolve;
  rejectReady = reject;
});

(async () => {
  try {
    log("Starting server initialization...");

    registerRoutes(app);
    log("Routes registered successfully");

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static serving for production...");
      serveStatic(app);
      log("Static serving setup completed");
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });

    // Skip server.listen() when running inside a serverless environment
    // (e.g. Vercel) where the platform provides its own request lifecycle.
    // Local dev (`npm run dev`) and standalone prod (`npm start`) still listen.
    if (!process.env.VERCEL) {
      const PORT = Number(process.env.PORT) || 5000;
      server.listen(PORT, "0.0.0.0", () => {
        log(`Server successfully started on port ${PORT}`);
        log("Server ready (API handles pending orders automatically)");
      });
    } else {
      log("Detected VERCEL environment — skipping server.listen()");
    }

    resolveReady();
  } catch (err) {
    log(`Fatal init error: ${err instanceof Error ? err.message : String(err)}`);
    rejectReady(err);
    throw err;
  }
})();

export { app, server, ready };
