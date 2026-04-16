import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import { injectSeoTags } from "./seo";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports: vite, nanoid, and vite.config are only needed in dev
  // mode and pull in heavy native deps (rollup) that don't exist on Vercel.
  const { createServer: createViteServer, createLogger } = await import("vite");
  const viteConfig = (await import("../vite.config")).default;
  const { nanoid } = await import("nanoid");
  const viteLogger = createLogger();

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: string, options?: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`)
      let page = await vite.transformIndexHtml(url, template);
      page = injectSeoTags(page, url);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Resolve relative to the working directory, not __dirname. After bundling
  // (esbuild for standalone prod, Vercel's @vercel/node for serverless), the
  // bundled file's __dirname is unreliable. process.cwd() is the project root
  // in both `npm start` (local) and Vercel function execution.
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with proper MIME types for Chrome
  app.use(express.static(distPath, {
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    },
    // Ensure proper caching headers
    maxAge: 0,
    etag: false
  }));

  // Cache the index.html template in memory for production
  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  // Handle SPA routing - serve index.html for non-asset routes
  app.get("*", (req, res) => {
    // Don't serve index.html for actual static assets
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return res.status(404).send('Not Found');
    }

    // Inject per-page SEO tags and serve
    const html = injectSeoTags(indexHtml, req.path);
    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
  });
}