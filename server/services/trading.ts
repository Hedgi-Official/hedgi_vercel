import fetch from 'node-fetch';

// Define interfaces for API interactions
interface XTBResponse {
  status?: boolean;
  returnData?: any;
  error?: string;
  errorDescr?: string;
  message?: string;
}

interface TradeTransInfo {
  cmd: number;           // 0 for BUY, 1 for SELL
  customComment?: string;
  expiration?: number;
  order: number;
  price?: number;
  offset?: number;
  sl?: number;           // Stop loss
  tp?: number;           // Take profit
  symbol: string;
  type?: number;         // 0 for open, 2 for close
  volume: number;
  [key: string]: any;    // To allow for dynamic properties
}

// External Flask server URL
const XTB_SERVER_URL = 'http://3.147.6.168';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Utility function to fetch with a timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function checkServerHealth(): Promise<boolean> {
  try {
    console.log('[Trading Service] Checking XTB server health');
    // Try to reach the server with a simple GET request to the root path
    // If the server is reachable but ping doesn't exist, it will return a 404, 
    // which is still a sign that the server is alive
    const response = await fetch(`${XTB_SERVER_URL}`);

    // Consider any response from the server as a sign it's available
    // Even if it's a 404, it means the server is running
    console.log(`[Trading Service] Server health check response: ${response.status}`);
    return true;
  } catch (error) {
    console.error('[Trading Service] XTB server health check failed:', error);
    return false;
  }
}

export class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes in milliseconds

  get isConnected(): boolean {
    return this.isLoggedIn && (Date.now() - this.lastLoginTime < this.sessionTimeout);
  }

  private async login(): Promise<void> {
    try {
      console.log('[Trading Service] Attempting login...');

      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 17535100,  // Use number format as per example
          password: "GuiZarHoh2711!"
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[Trading Service] Login response:', data);

      if (!data.status) {
        throw new Error(data.errorDescr || 'Login failed');
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    try {
      await this.login();
    } catch (error) {
      console.error('[Trading Service] Connection error:', error);
      throw error;
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.isLoggedIn || (Date.now() - this.lastLoginTime >= this.sessionTimeout)) {
      await this.login();
    }
  }

  async openTrade(
    symbol: string,
    volume: number,
    isBuy: boolean,
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        volume, isBuy
      });

      // Follow exact format from example
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo: {
              cmd: isBuy ? 0 : 1,     // 0 for BUY, 1 for SELL
              symbol: symbol,
              volume: volume,          // Volume is already in lots (0.1 = 10,000 units)
              price: 0,               // 0 for market price
              offset: 0,
              order: 0                // 0 for new trades
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Trade failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[Trading Service] Trade response:', data);

      if (!data.status) {
        throw new Error(data.errorDescr || 'Trade failed');
      }

      return data.returnData?.order || 0;
    } catch (error) {
      console.error('[Trading Service] Open trade error:', error);
      throw error;
    }
  }

  async closeTrade(
    symbol: string,
    orderNumber: number,
    volume: number,
    isBuy: boolean,
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      // Follow exact format from example for closing trades
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo: {
              cmd: isBuy ? 0 : 1,
              customComment: "Close trade test",
              expiration: 0,
              offset: 0,
              order: orderNumber + 1,  // According to example, use order + 1
              price: 0,                // Market price
              symbol: symbol,
              type: 2,                 // 2 for close
              volume: volume
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Close trade failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('[Trading Service] Close trade response:', data);

      if (!data.status) {
        throw new Error(data.errorDescr || 'Close trade failed');
      }

      return data.returnData?.order || 0;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();

      // Follow exact format from example
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "getTrades",
          arguments: {
            openedOnly: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Status check failed');
      }

      const data = await response.json();
      console.log('[Trading Service] Trade status response:', data);

      if (!data.status) {
        throw new Error(data.errorDescr || 'Status check failed');
      }

      const trades = data.returnData || [];
      const trade = trades.find((t: any) => Number(t.order) === Number(tradeNumber));

      return {
        status: true,
        returnData: trade || { status: 'NOT_FOUND', order: tradeNumber },
        message: trade ? 'Trade found' : 'Trade not found or closed'
      };
    } catch (error) {
      console.error('[Trading Service] Status check error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();