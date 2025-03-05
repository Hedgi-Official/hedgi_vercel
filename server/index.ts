import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add test endpoint
app.get('/ping', (req, res) => {
  log('Ping endpoint called');
  res.json({ message: 'pong' });
});

// Enhanced request logging middleware
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

  // Initialize routes first to ensure API endpoints are ready
  const server = registerRoutes(app);
  log("Routes registered successfully");

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Error: ${message}`);
    res.status(status).json({ message });
  });

  // Setup Vite or static serving based on environment
  if (app.get("env") === "development") {
    log("Setting up Vite in development mode...");
    await setupVite(app, server);
    log("Vite setup completed");
  } else {
    log("Setting up static serving for production...");
    serveStatic(app);
    log("Static serving setup completed");
  }

  // Bind server to port with better error handling and logging
  const PORT = parseInt(process.env.PORT || '5000', 10);

  try {
    log(`Attempting to start server on port ${PORT}...`);
    
    // Create a promise that resolves when the server starts
    const serverStart = new Promise<void>((resolve, reject) => {
      // Set a timeout to catch hanging server starts
      const timeout = setTimeout(() => {
        reject(new Error(`Server failed to start within timeout period`));
      }, 10000); // 10 second timeout
      
      server.listen(PORT, "0.0.0.0", () => {
        clearTimeout(timeout);
        log(`Server successfully bound and listening on port ${PORT}`);
        log(`Test endpoint available at http://0.0.0.0:${PORT}/ping`);
        resolve();
      }).on('error', (e: any) => {
        clearTimeout(timeout);
        if (e.code === 'EADDRINUSE') {
          log(`Port ${PORT} is already in use. Please use a different port.`);
          // Alternatively, we could try a different port automatically
          // For now, we'll exit with an error
          process.exit(1);
        } else {
          log(`Server error: ${e.message}`);
          reject(e);
        }
      });
    });
    
    // Wait for server to start
    await serverStart;
    
  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();