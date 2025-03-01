import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { bridgeProcess } from "./start-services";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = registerRoutes(app);

  // Handle bridge process errors and cleanup
  bridgeProcess.on('exit', (code) => {
    if (code !== 0) {
      log('XTB Bridge process exited with code ' + code);
      // Don't exit the main process, just log the error
      log('Attempting to restart bridge process...');
    }
  });

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT || '5000', 10);
  const startServer = (port: number) => {
    log(`Attempting to start server on port ${port}...`);
    server.listen(port, "0.0.0.0", () => {
      log(`Server running on port ${port}`);
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