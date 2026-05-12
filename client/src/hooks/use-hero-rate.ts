import { useEffect, useState } from "react";

export interface HeroRate {
  rate: number;
  breakevenRate: number;
  fetchedAt: string;
  stale: boolean;
}

/**
 * Fallback values shown before the first fetch resolves or when the
 * endpoint is unreachable. Match the server-side FALLBACK so the first
 * render and a stale/offline server both display the same numbers.
 */
const FALLBACK: HeroRate = {
  rate: 5.2345,
  breakevenRate: 5.2395,
  fetchedAt: new Date(0).toISOString(),
  stale: true,
};

/**
 * Polls /api/hedgi/quotes/hero-rate every `pollIntervalMs` and exposes
 * the cached reference rate + a liveness flag. The live flag is `true`
 * only when the endpoint responded AND the server reports `stale: false`.
 * When the endpoint is unreachable OR the server reports stale, returns
 * the last known values with `isLive: false`.
 */
export function useHeroRate(pollIntervalMs = 60_000) {
  const [data, setData] = useState<HeroRate>(FALLBACK);
  const [unreachable, setUnreachable] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/hedgi/quotes/hero-rate", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = (await response.json()) as HeroRate;
        if (cancelled) return;
        setData(json);
        setUnreachable(false);
        setHasLoaded(true);
      } catch {
        if (!cancelled) setUnreachable(true);
      }
    };

    void poll();
    const id = window.setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollIntervalMs]);

  const isLive = !unreachable && !data.stale;
  /**
   * True once we've received any successful response from the endpoint,
   * even if the server reported stale. Used by consumers that want to
   * distinguish "endpoint is silent" (show em-dash) from "endpoint is
   * reachable but data is stale" (show last known value).
   */
  return { data, isLive, hasLoaded };
}
