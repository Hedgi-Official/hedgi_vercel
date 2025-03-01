import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { bridgeProcess } from "./start-services";

// Add global error handlers
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(error.stack || 'No stack trace available');
});

process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection at:', promise);
  log('Reason:', reason);
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add test endpoint
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

(async () => {
  log("Starting server initialization...");
  const server = registerRoutes(app);
  log("Routes registered successfully");

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    log("Setting up Vite in development mode...");
    await setupVite(app, server);
    log("Vite setup completed");
  } else {
    log("Setting up static serving for production...");
    serveStatic(app);
    log("Static serving setup completed");
  }

  // Port configuration moved to the top for clarity
  const PORT = 5000; // Fixed to port 5000 as required

  const startServer = (port: number) => {
    log(`Attempting to start server on port ${port}...`);
    server.listen(port, "0.0.0.0", () => {
      log(`Server successfully bound and listening on port ${port}`);
      log(`Test endpoint available at http://0.0.0.0:${port}/ping`);
    }).on('error', (e: any) => {
      if (e.code === 'EADDRINUSE') {
        log(`Port ${port} is busy, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        log(`Server error: ${e.message}`);
      }
    });
  };

  startServer(PORT);
})();