import { Agent as HttpsAgent } from 'node:https';

/** Cloudflare tunnel: one agent per host, keep sockets open ≥ 30 s */
export const cfAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 30_000,
  maxSockets: 10,     // enough for burst traffic
  maxFreeSockets: 5,
  timeout: 60_000     // hard kill if CF really hangs
});

/** Regular HTTP agent for non-tunnel endpoints */
export const httpAgent = new HttpsAgent({
  keepAlive: true,
  keepAliveMsecs: 15_000,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 30_000
});