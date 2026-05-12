/**
 * Vercel serverless adapter for the Express app.
 *
 * Imports from the pre-bundled `server-build/index.js` (built by esbuild
 * in `npm run build:vercel`). This avoids Node.js ESM bare-import errors
 * — Vercel's @vercel/node transpiles but doesn't bundle, so raw source
 * imports like `from "./routes"` (no extension) fail under strict ESM.
 * The esbuild bundle resolves all internal imports at build time.
 *
 * The bundle lives outside `dist/` on purpose: Vercel's Vite framework
 * preset treats the project's `dist/` as a static-asset root, and any
 * file inside it can be served by the CDN. Keeping the server bundle at
 * `server-build/index.js` (outside `dist/`) prevents the CDN from ever
 * exposing it as a static asset at unintended URLs — a bug that
 * surfaced as `GET /` returning `application/javascript` instead of the
 * SPA shell. See docs/MIGRATION.md for the full history.
 *
 * The async IIFE in server/index.ts registers routes, sets up static
 * serving, and installs the error handler. We await the `ready` promise
 * before forwarding requests so the first cold-start request doesn't
 * race ahead of route registration.
 */
import type { IncomingMessage, ServerResponse } from "http";
// @ts-ignore — server-build/index.js is a build artifact; TS can't check it
import { app, ready } from "../server-build/index.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await ready;
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
