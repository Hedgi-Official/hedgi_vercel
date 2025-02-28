import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to start the XTB bridge service
function startXTBBridge() {
  const pythonBridge = spawn('python3', [join(__dirname, 'services/xtb_bridge.py')]);

  pythonBridge.stdout.on('data', (data) => {
    log(`[XTB Bridge] ${data}`);
  });

  pythonBridge.stderr.on('data', (data) => {
    console.error(`[XTB Bridge Error] ${data}`);
  });

  pythonBridge.on('close', (code) => {
    log(`[XTB Bridge] Process exited with code ${code}`);
    // Restart the bridge if it crashes
    setTimeout(startXTBBridge, 5000);
  });
}

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
  try {
    // First try to kill any existing process on port 5000 and 8765
    try {
      const killCommand = process.platform === 'win32' ? 
        `taskkill /F /IM node.exe /FI "PID ne ${process.pid}" && taskkill /F /IM python.exe` :
        `lsof -ti:5000,8765 | xargs kill -9`;

      require('child_process').execSync(killCommand, { stdio: 'ignore' });
      log('Cleaned up ports 5000 and 8765');
    } catch (e) {
      // Ignore errors if no process was found
    }

    // Start the XTB bridge service
    startXTBBridge();

    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Express server serving on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();