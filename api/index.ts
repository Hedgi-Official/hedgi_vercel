/**
 * Vercel serverless adapter for the Express app.
 *
 * Imports from the pre-bundled `server-build/index.js` (built by esbuild
 * in `npm run build:vercel`). The bundle lives outside `dist/` because
 * Vercel's Vite framework preset treats `dist/` as a static-asset root —
 * any file inside it can be exposed by the CDN at an unintended URL.
 * Keeping the server bundle at `server-build/index.js` prevents `GET /`
 * from ever returning the esbuild bundle as `application/javascript`
 * instead of the SPA shell.
 *
 * We await the `ready` promise before forwarding requests so the first
 * cold-start request doesn't race ahead of route registration in
 * server/index.ts.
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
