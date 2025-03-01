import { z } from "zod";
import fetch from 'node-fetch';

// Define interfaces for API interactions
interface XTBResponse {
  success: boolean;
  error?: string;
  status?: string;
  orderId?: number;
  message?: string;
}

interface TradeTransInfo {
  cmd: number;      // 0 for BUY, 1 for SELL
  customComment: string;
  expiration: number;
  order: number;
  price: number;
  sl: number;      // Stop loss
  tp: number;      // Take profit
  symbol: string;
  type: number;    // 0 for open, 2 for close
  volume: number;
}

// Schema for trade transaction info validation
const tradeTransInfoSchema = z.object({
  cmd: z.number(),
  customComment: z.string(),
  expiration: z.number(),
  order: z.number(),
  price: z.number(),
  sl: z.number(),
  tp: z.number(),
  symbol: z.string(),
  type: z.number(),
  volume: z.number(),
});

const BRIDGE_URL = 'http://localhost:8000';
const MAX_RETRIES = 5; // Increased from 3
const INITIAL_RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBridgeHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BRIDGE_URL}/ping`);
    if (!response.ok) return false;
    const data: any = await response.json();
    return data.message === 'pong' && data.ready === true;
  } catch (error) {
    console.error('[Trading Service] Health check failed:', error);
    return false;
  }
}

async function waitForBridge(maxRetries: number = MAX_RETRIES): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const isHealthy = await checkBridgeHealth();
    if (isHealthy) {
      console.log('[Trading Service] Bridge is healthy');
      return true;
    }
    // Exponential backoff with jitter
    const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, i), 10000) + Math.random() * 1000;
    console.log(`[Trading Service] Bridge not ready, retrying in ${Math.round(delay)}ms... (attempt ${i + 1}/${maxRetries})`);
    await wait(delay);
  }
  throw new Error('Python bridge service is not available after maximum retries');
}

export class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes in milliseconds

  private async ensureLoggedIn(): Promise<void> {
    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Already logged in with valid session');
      return;
    }

    // Enhanced bridge connection handling
    try {
      await waitForBridge();
      console.log('[Trading Service] Bridge is available, proceeding with login');
    } catch (error) {
      console.error('[Trading Service] Bridge connection failed:', error);
      throw error;
    }

    console.log('[Trading Service] Logging in...');
    await this.login();
  }

  private async login(): Promise<void> {
    try {
      const response = await fetch(`${BRIDGE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: process.env.XTB_USER_ID || '17535100',
          password: process.env.XTB_PASSWORD || 'GuiZarHoh2711!'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Login failed');
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in');
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }

  async openTrade(
    symbol: string,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    customComment: string = "",
    expiration: number = 0
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      // Adjust volume for USDBRL and USDMXN
      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        price, originalVolume: volume, adjustedVolume, isBuy, customComment
      });

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          volume: adjustedVolume,
          command: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
          orderType: 0  // 0 for OPEN
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Trade failed');
      }

      const data: XTBResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Trade failed');
      }

      console.log(`[Trading Service] Trade opened. Order number: ${data.orderId}`);
      return data.orderId!;
    } catch (error) {
      console.error('[Trading Service] Open trade error:', error);
      throw error;
    }
  }

  async closeTrade(
    symbol: string,
    positionToClose: number,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    customComment: string = "",
    expiration: number = 0
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      // Adjust volume for USDBRL and USDMXN
      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

      console.log(`[Trading Service] Closing trade for ${symbol}`, {
        positionToClose, price, originalVolume: volume, adjustedVolume, isBuy, customComment
      });

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          volume: adjustedVolume,
          command: isBuy ? 0 : 1,
          orderType: 2,  // 2 for CLOSE
          order: positionToClose
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Close trade failed');
      }

      const data: XTBResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Close trade failed');
      }

      console.log(`[Trading Service] Trade closed. Order number: ${data.orderId}`);
      return data.orderId!;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();

      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await fetch(`${BRIDGE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: tradeNumber })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Status check failed');
      }

      const data: XTBResponse = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Status check failed');
      }

      console.log(`[Trading Service] Trade status response:`, data);
      return data;
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();