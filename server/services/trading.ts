import { z } from "zod";
import fetch from 'node-fetch';

// Define interfaces for API interactions
interface XTBResponse {
  success: boolean;
  error?: string;
  status?: string;
  orderId?: number;
  message?: string;
  debug_info?: any;
}

const BRIDGE_URL = 'http://localhost:8003'; // Bridge running on port 8003
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000;

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

export class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes

  private async ensureLoggedIn(): Promise<void> {
    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      return;
    }

    try {
      const bridgeReady = await checkBridgeHealth();
      if (!bridgeReady) {
        throw new Error('Python bridge is not ready');
      }

      await this.login();
    } catch (error) {
      console.error('[Trading Service] Bridge connection failed:', error);
      throw error;
    }
  }

  private async login(): Promise<void> {
    try {
      const response = await fetch(`${BRIDGE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: process.env.XTB_USER_ID || '',
          password: process.env.XTB_PASSWORD || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}`);
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
    volume: number,
    isBuy: boolean,
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      // Adjust volume for USDBRL and USDMXN
      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        volume: adjustedVolume,
        isBuy
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
        throw new Error(`Trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Trade response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Trade failed');
      }

      if (!data.orderId) {
        throw new Error('No order ID returned');
      }

      return data.orderId;
    } catch (error) {
      console.error('[Trading Service] Open trade error:', error);
      throw error;
    }
  }

  async closeTrade(
    symbol: string,
    positionId: number,
    volume: number,
    isBuy: boolean,
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

      console.log(`[Trading Service] Closing trade for ${symbol}`, {
        positionId,
        volume: adjustedVolume,
        isBuy
      });

      const response = await fetch(`${BRIDGE_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          volume: adjustedVolume,
          command: isBuy ? 0 : 1,
          orderType: 2,  // 2 for CLOSE
          order: positionId
        })
      });

      if (!response.ok) {
        throw new Error(`Close trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Close trade response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Close trade failed');
      }

      if (!data.orderId) {
        throw new Error('No order ID returned');
      }

      return data.orderId;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(orderId: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();

      console.log(`[Trading Service] Checking status for trade ${orderId}`);

      const response = await fetch(`${BRIDGE_URL}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!response.ok) {
        throw new Error(`Status check failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
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

  get isConnected(): boolean {
    return this.isLoggedIn;
  }
}

// Export a singleton instance
export const xtbService = new TradingService();