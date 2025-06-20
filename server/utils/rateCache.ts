// Rate caching and throttling utility to prevent overwhelming Flask server
interface CachedRate {
  data: any;
  timestamp: number;
  broker: string;
  symbol: string;
}

class RateCache {
  private cache = new Map<string, CachedRate>();
  private readonly CACHE_TTL = 5000; // 5 seconds cache
  private readonly pendingRequests = new Map<string, Promise<any>>();

  private getCacheKey(broker: string, symbol: string): string {
    return `${broker}-${symbol}`;
  }

  private isExpired(cached: CachedRate): boolean {
    return Date.now() - cached.timestamp > this.CACHE_TTL;
  }

  async getRate(broker: string, symbol: string, fetcher: () => Promise<any>): Promise<any> {
    const key = this.getCacheKey(broker, symbol);
    
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      console.log(`[RateCache] Cache hit for ${key}`);
      return cached.data;
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`[RateCache] Waiting for pending request for ${key}`);
      return pending;
    }

    // Make new request
    console.log(`[RateCache] Making new request for ${key}`);
    const requestPromise = this.makeRequest(key, broker, symbol, fetcher);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(key);
      return result;
    } catch (error) {
      this.pendingRequests.delete(key);
      throw error;
    }
  }

  private async makeRequest(key: string, broker: string, symbol: string, fetcher: () => Promise<any>): Promise<any> {
    try {
      const data = await fetcher();
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        broker,
        symbol
      });

      return data;
    } catch (error) {
      // Cache error response for short time to prevent rapid retries
      const errorData = {
        bid: 0,
        ask: 0,
        swap_long: 0,
        swap_short: 0,
        broker,
        symbol,
        error: `Failed to fetch rate from ${broker} API`
      };
      
      this.cache.set(key, {
        data: errorData,
        timestamp: Date.now(),
        broker,
        symbol
      });

      return errorData;
    }
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL * 2) {
        this.cache.delete(key);
      }
    }
  }
}

export const rateCache = new RateCache();

// Clean up expired cache entries every 30 seconds
setInterval(() => {
  rateCache.clearExpired();
}, 30000);