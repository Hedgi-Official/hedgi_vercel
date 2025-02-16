import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try alternative ports if 5000 is in use
  const tryPort = async (port: number, maxAttempts: number = 3): Promise<number> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await new Promise((resolve, reject) => {
          const testServer = createServer();
          testServer.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              testServer.close();
              reject(err);
            }
          });
          testServer.once('listening', () => {
            testServer.close();
            resolve(undefined);
          });
          testServer.listen(port);
        });
        return port;
      } catch (err) {
        if (attempt === maxAttempts - 1) throw err;
        port++;
      }
    }
    throw new Error('No available ports found');
  };

  try {
    const PORT = await tryPort(5000);
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();