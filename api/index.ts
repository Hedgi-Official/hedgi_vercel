/**
 * Vercel serverless adapter for the Express app.
 *
 * On Vercel, this file becomes a Node serverless function. Vercel bundles it
 * with @vercel/node, which uses esbuild under the hood — same module
 * resolution as our local tsx setup.
 *
 * Why a thin adapter and not Express directly?
 *   server/index.ts has an async IIFE that registers routes, sets up static
 *   serving, and installs the error handler. That work is initiated at import
 *   time but isn't synchronous. We must await it before forwarding requests
 *   on a cold start, or the very first request can race ahead of route
 *   registration and return 404.
 *
 * The vercel.json rewrites all paths (/api/*, SPA pages, even static fallback
 * misses) to this function. Express then handles each path itself: the existing
 * routers serve /api/*, server/vite.ts:serveStatic serves /assets/* and the
 * SPA index.html with per-route SEO injection.
 */
import type { IncomingMessage, ServerResponse } from "http";
import { app, ready } from "../server/index.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await ready;
  // Express's app() satisfies the (req, res, next?) signature; cast to bypass
  // the IncomingMessage→Request widening that @types/express enforces.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
