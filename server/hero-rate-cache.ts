/**
 * Server-side cache for the /business hero "reference rate" display.
 *
 * The marketing PreviewCard polls this cache every 60s via
 * GET /api/hedgi/quotes/hero-rate. The endpoint is a pure cache read;
 * it never triggers an upstream fetch. The cache is populated by the
 * background task started in server/index.ts via startHeroRateRefresh().
 *
 * Vercel serverless caveat: setInterval only ticks while a function
 * instance is warm. Cold-started instances fire the initial refresh on
 * module load. Between those, the cache may briefly serve fallback /
 * stale values until the first successful fetch completes. For a
 * marketing landing page this is acceptable — a correct-but-slightly-
 * stale rate is preferable to blocking every cold-start request on an
 * upstream call.
 */

import fetch from "node-fetch";

const HEDGI_API_BASE = "https://api.hedgi.ai";
const REFRESH_INTERVAL_MS = 60_000;

export interface HeroRate {
  /** Current USDBRL mid-rate (4-decimal precision when rendered). */
  rate: number;
  /** Breakeven rate = rate + all-in cost. Drives "You pay" display. */
  breakevenRate: number;
  /** ISO timestamp of the last successful upstream fetch. */
  fetchedAt: string;
  /** True when the last fetch attempt failed or we're serving fallback. */
  stale: boolean;
}

const FALLBACK: HeroRate = {
  rate: 5.2345,
  breakevenRate: 5.2395,
  fetchedAt: new Date().toISOString(),
  stale: true,
};

let cache: HeroRate = { ...FALLBACK };
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let refreshInFlight = false;

async function refresh(): Promise<void> {
  if (refreshInFlight) {
    console.log("[hero-rate] refresh skipped (in-flight)");
    return;
  }
  refreshInFlight = true;
  console.log("[hero-rate] refresh start");

  try {
    const response = await fetch(`${HEDGI_API_BASE}/api/quotes/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "USDBRL",
        direction: "buy",
        volume: 0.1,
        duration_days: 30,
        best_only: false,
      }),
    });

    console.log(`[hero-rate] upstream HTTP ${response.status}`);

    if (!response.ok) {
      cache = { ...cache, stale: true };
      return;
    }

    const data = (await response.json()) as {
      synthetic_rate?: number;
      breakeven_rate?: number;
    };

    const rate = Number(data.synthetic_rate);
    const breakevenRate = Number(data.breakeven_rate);

    if (!Number.isFinite(rate) || !Number.isFinite(breakevenRate)) {
      console.warn(
        `[hero-rate] bad upstream shape: rate=${data.synthetic_rate} breakeven=${data.breakeven_rate}`,
      );
      cache = { ...cache, stale: true };
      return;
    }

    cache = {
      rate,
      breakevenRate,
      fetchedAt: new Date().toISOString(),
      stale: false,
    };
    console.log(
      `[hero-rate] refresh ok rate=${rate} breakeven=${breakevenRate}`,
    );
  } catch (error) {
    console.warn(
      "[hero-rate] fetch failed:",
      error instanceof Error ? error.message : error,
    );
    cache = { ...cache, stale: true };
  } finally {
    refreshInFlight = false;
  }
}

export function startHeroRateRefresh(): void {
  if (intervalHandle !== null) return;

  // Kick off the first refresh immediately (non-blocking). Works in
  // long-running processes (local dev, standalone prod). On Vercel
  // serverless the function may freeze before this promise settles,
  // so we also handle refresh on read — see maybeTriggerRefresh().
  void refresh();

  intervalHandle = setInterval(() => {
    void refresh();
  }, REFRESH_INTERVAL_MS);

  if (typeof intervalHandle.unref === "function") {
    intervalHandle.unref();
  }
}

/**
 * Read-side refresh trigger. If the cache is older than the refresh
 * interval, kicks off an async refresh WITHOUT awaiting it. The caller
 * serves the current cache immediately (serverless-safe: no blocking
 * fetches from the request path).
 *
 * Purpose: on Vercel serverless, timer-based background work (setInterval)
 * doesn't reliably run because functions freeze between requests. Each
 * request effectively gets a fresh event loop that only runs for the
 * duration of that request. A fire-and-forget refresh tied to endpoint
 * reads closes that gap — warm traffic keeps the cache fresh, and a
 * cold instance's first reader serves fallback while kicking off the
 * refresh for the next reader.
 */
function maybeTriggerRefresh(): void {
  if (refreshInFlight) return;
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  if (age < REFRESH_INTERVAL_MS && !cache.stale) return;
  void refresh();
}

export function getHeroRate(): HeroRate {
  maybeTriggerRefresh();
  return { ...cache };
}
