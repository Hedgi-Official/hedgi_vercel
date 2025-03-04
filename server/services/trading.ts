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

const BRIDGE_URL = 'https://your-flask-app-434424736588.us-central1.run.app';
const HEDGE_EXECUTION_URL = 'https://your-flask-app-434424736588.us-central1.run.app/execute-trade';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkBridgeHealth(): Promise<boolean> {
  try {
    console.log('Using BRIDGE_URL:', BRIDGE_URL);
    const response = await fetch(`${BRIDGE_URL}/ping`);
    if (!response.ok) return false;

    // Clone the response to log the raw text without consuming the original response
    const rawText = await response.clone().text();
    console.log('Raw /ping response:', rawText);

    const data = await response.json() as { status: string };
    return data.status === 'ok';
  } catch (error) {
    console.error('[Trading Service] Health check failed:', error);
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

  async connect(): Promise<void> {
    try {
      await this.ensureLoggedIn();
    } catch (error) {
      console.error('[Trading Service] Connection error:', error);
      throw error;
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Already logged in with valid session');
      return;
    }

    // Wait for bridge to be healthy
    for (let i = 0; i < MAX_RETRIES; i++) {
      const isHealthy = await checkBridgeHealth();
      if (isHealthy) {
        console.log('[Trading Service] Bridge is healthy, proceeding with login');
        break;
      }
      if (i < MAX_RETRIES - 1) {
        console.log(`[Trading Service] Bridge not ready, retrying in ${RETRY_DELAY}ms...`);
        await wait(RETRY_DELAY);
      } else {
        throw new Error('Python bridge service is not available');
      }
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
        const error = await response.json() as { detail: string };
        throw new Error(error.detail || 'Login failed');
      }

      // Use the "status" field returned by the API
      const data = await response.json() as { status: string };
      if (data.status !== 'connected') {
        throw new Error('Login failed');
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in');
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }


  async executeHedge(hedgeParams: any): Promise<any> {
    try {
      console.log('[Trading Service] Executing hedge with params:', hedgeParams);

      const response = await fetch(HEDGE_EXECUTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hedgeParams)
      });

      if (!response.ok) {
        const error = await response.json() as { detail: string };
        throw new Error(error.detail || 'Hedge execution failed');
      }

      const data = await response.json();
      console.log('[Trading Service] Hedge executed successfully:', data);
      return data;
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
      throw error;
    }
  }

  async getSymbolData(symbol: string): Promise<any> {
    try {
      await this.ensureLoggedIn();
      const response = await fetch(`${BRIDGE_URL}/symbol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });

      if (!response.ok) {
        const error = await response.json() as { detail: string };
        throw new Error(error.detail || 'Failed to get symbol data');
      }

      return response.json();
    } catch (error) {
      console.error(`[Trading Service] Get symbol data error for ${symbol}:`, error);
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

      // XTB uses standard lots where 1 lot = 100,000 units of base currency
      // Convert to lots properly - this is the ONLY place we should do the conversion
      const adjustedVolume = volume / 100000;
      
      // Make sure we're not below minimum lot size (usually 0.01)
      const finalVolume = Math.max(adjustedVolume, 0.01);

      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        price, originalVolume: volume, adjustedToLots: adjustedVolume, finalVolume, isBuy, customComment
      });

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          volume: finalVolume,
          command: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
          orderType: 0  // 0 for OPEN
        })
      });

      if (!response.ok) {
        const error = await response.json() as { detail: string };
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

      // XTB uses standard lots where 1 lot = 100,000 units of base currency
      // Convert to lots properly - this is the ONLY place we should do the conversion
      const adjustedVolume = volume / 100000;
      
      // Make sure we're not below minimum lot size (usually 0.01)
      const finalVolume = Math.max(adjustedVolume, 0.01);

      console.log(`[Trading Service] Closing trade for ${symbol}`, {
        positionToClose, price, originalVolume: volume, adjustedToLots: adjustedVolume, finalVolume, isBuy, customComment
      });

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          volume: finalVolume,
          command: isBuy ? 0 : 1,
          orderType: 2,  // 2 for CLOSE
          order: positionToClose
        })
      });

      if (!response.ok) {
        const error = await response.json() as { detail: string };
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

      if (response.status === 304) {
        console.warn('Received 304 Not Modified, returning fallback trade status');
        return {
          success: true,
          message: 'No change',
          orderId: tradeNumber,
          status: 'unknown'
        };
      }

      if (!response.ok) {
        const error = await response.json() as { detail: string };
        throw new Error(error.detail || 'Status check failed');
      }

      const data: XTBResponse = await response.json();
      console.log(`[Trading Service] Trade status response:`, data);

      if (!data.success) {
        throw new Error(data.error || 'Status check failed');
      }

      return data;
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }


}



// Export a singleton instance
export const tradingService = new TradingService();