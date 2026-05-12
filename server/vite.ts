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
  // Dynamic imports: vite, nanoid, and vite.config are only needed in dev.
  // The variable indirection (`configPath`) prevents esbuild from inlining
  // vite.config.ts into the production bundle, which would pull in a
  // top-level `import "vite"` → rollup → platform-specific native binaries.
  const { createServer: createViteServer, createLogger } = await import("vite");
  const configPath = "../vite.config";
  const viteConfig = (await import(configPath)).default;
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

  // Serve hashed/static assets. `index: false` is critical — without it,
  // express.static auto-serves dist/public/index.html for `/` and applies
  // its `Last-Modified` heuristic (Vercel normalizes deployed file mtime
  // to 2018-10-20), so browsers' If-Modified-Since revalidations always
  // get 304 and reuse the cached HTML. That HTML embeds the previous
  // build's content-hashed asset URLs (`/assets/index-<hash>.js`); after
  // the next deploy those hashes are gone and the page renders blank
  // because the bundle 404s. Letting the catch-all below own `/` keeps
  // the SPA shell uncached without losing the 304 win on the hashed
  // bundles, where Last-Modified is correct (same hash = same content).
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, path) => {
      // sw.js must never be 304'd. Vercel normalizes every deployed
      // file's mtime to 2018-10-20, so If-Modified-Since revalidations
      // always match the previously cached copy and the browser keeps
      // the old SW forever — the update check sees no change and the
      // new SW never installs. Strip Last-Modified and force no-cache
      // so the file is re-fetched whole on every check.
      if (path.endsWith('sw.js')) {
        res.removeHeader('Last-Modified');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      if (path.endsWith('.js') || path.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (path.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
    },
    maxAge: 0,
    etag: false,
  }));

  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.get("*", (req, res) => {
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return res.status(404).send('Not Found');
    }

    const html = injectSeoTags(indexHtml, req.path);
    res
      .status(200)
      .set({
        "Content-Type": "text/html; charset=utf-8",
        // Force the SPA shell to revalidate every load. Bundles inside
        // are already content-hashed, so the no-store applies only to
        // index.html itself.
        "Cache-Control": "no-store, must-revalidate",
      })
      .end(html);
  });
}