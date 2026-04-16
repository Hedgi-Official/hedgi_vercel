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

// Sets the `hedgi-geo` cookie from Vercel's x-vercel-ip-country header on
// the first request that doesn't already have one. The client-side i18n
// geo detector reads this cookie to route Brazilian visitors to pt-BR by
// default without overriding explicit /pt URL paths or a prior language
// choice cached in localStorage. No-op locally (header is Vercel-set).
app.use((req, res, next) => {
  const country = req.headers['x-vercel-ip-country'] as string | undefined;
  const cookieHeader = req.headers.cookie || '';
  const hasGeoCookie = /(?:^|;\s*)hedgi-geo=/.test(cookieHeader);
  if (country && !hasGeoCookie) {
    res.cookie('hedgi-geo', country, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30
    });
  }
  next();
});

app.get('/ping', (req, res) => {
  log('Ping endpoint called');
  res.json({ message: 'pong' });
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
