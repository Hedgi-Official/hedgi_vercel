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

const BRIDGE_URL = 'http://127.0.0.1:8001';  // Use loopback address
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const STARTUP_DELAY = 15000; // 15 seconds startup delay

// Helper function to wait for specified milliseconds
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wait for startup delay
await wait(STARTUP_DELAY);

async function checkBridgeHealth(): Promise<boolean> {
  try {
    console.log('[Trading Service] Checking bridge health...');
    const response = await fetch(`${BRIDGE_URL}/health`, {
      timeout: 5000 // 5 second timeout
    }).catch((error) => {
      console.error('[Trading Service] Fetch error:', error.message);
      return null;
    });

    if (!response) {
      console.error('[Trading Service] No response from health check');
      return false;
    }

    if (!response.ok) {
      console.error(`[Trading Service] Health check failed with status ${response.status}`);
      return false;
    }

    const data = await response.json();
    console.log('[Trading Service] Health check response:', data);

    if (!data.ready) {
      console.error('[Trading Service] Bridge reports not ready');
      return false;
    }

    console.log('[Trading Service] Bridge health check passed');
    return true;
  } catch (error) {
    console.error('[Trading Service] Health check failed:', error);
    return false;
  }
}

async function waitForBridge(): Promise<boolean> {
  console.log('[Trading Service] Starting bridge connection checks...');

  for (let i = 0; i < MAX_RETRIES; i++) {
    console.log(`[Trading Service] Connection attempt ${i + 1}/${MAX_RETRIES}`);

    const isHealthy = await checkBridgeHealth();
    if (isHealthy) {
      console.log('[Trading Service] Bridge is healthy and ready');
      return true;
    }

    if (i < MAX_RETRIES - 1) {
      const delay = INITIAL_RETRY_DELAY * (i + 1); // Linear backoff
      console.log(`[Trading Service] Bridge not ready, waiting ${delay}ms before retry...`);
      await wait(delay);
    }
  }

  throw new Error('Python bridge service is not available after maximum retries');
}

export class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes
  private bridgeReady = false;

  private async ensureBridgeAndLogin(): Promise<void> {
    if (!this.bridgeReady) {
      console.log('[Trading Service] Ensuring bridge is ready...');
      try {
        await waitForBridge();
        this.bridgeReady = true;
      } catch (error) {
        console.error('[Trading Service] Bridge initialization failed:', error);
        this.bridgeReady = false; // Reset flag on failure
        throw error;
      }
    }

    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Using existing valid session');
      return;
    }

    await this.login();
  }

  private async login(): Promise<void> {
    try {
      console.log('[Trading Service] Attempting login...');
      const response = await fetch(`${BRIDGE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: '17535100',
          password: 'GuiZarHoh2711!'
        }),
        timeout: 10000 // 10 second timeout
      }).catch((error) => {
        console.error('[Trading Service] Login fetch error:', error.message);
        throw error;
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
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
      this.isLoggedIn = false;
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
      await this.ensureBridgeAndLogin();

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
        }),
        timeout: 10000 // 10 second timeout
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
      await this.ensureBridgeAndLogin();

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
        }),
        timeout: 10000 // 10 second timeout
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
      await this.ensureBridgeAndLogin();

      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await fetch(`${BRIDGE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: tradeNumber }),
        timeout: 10000 // 10 second timeout
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