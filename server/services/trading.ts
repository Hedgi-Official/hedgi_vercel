import { z } from "zod";
import fetch from 'node-fetch';

// Define interfaces for API interactions
interface XTBResponse {
  success?: boolean;
  error?: string;
  status?: boolean | string;
  returnData?: any;
  orderId?: number;
  message?: string;
}

// Define XTB API response type
interface XTBApiResponse {
  status: boolean;
  returnData?: any;
  errorCode?: string;
  errorDescr?: string;
}

interface TradeTransInfo {
  cmd: number;      // 0 for BUY, 1 for SELL
  customComment?: string;
  expiration?: number;
  order?: number;
  offset?: number;
  price: number;
  sl?: number;      // Stop loss
  tp?: number;      // Take profit
  symbol: string;
  type?: number;    // 0 for open, 2 for close
  volume: number;
}

// Schema for trade transaction info validation
const tradeTransInfoSchema = z.object({
  cmd: z.number(),
  customComment: z.string().optional(),
  expiration: z.number().optional(),
  order: z.number().optional(),
  offset: z.number().optional(),
  price: z.number(),
  sl: z.number().optional(),
  tp: z.number().optional(),
  symbol: z.string(),
  type: z.number().optional(),
  volume: z.number(),
});

// New Flask server URL
const XTB_SERVER_URL = 'http://3.147.6.168';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerHealth(): Promise<boolean> {
  try {
    console.log('[Trading Service] Checking XTB server health...');
    
    // We don't have a specific health endpoint, so we'll try a basic command
    // Most APIs support a ping or basic info endpoint
    const response = await fetch(`${XTB_SERVER_URL}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandName: 'getVersion'
      })
    });
    
    if (!response.ok) {
      console.error('[Trading Service] Server health check failed with status:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('[Trading Service] Server health check response:', data);
    return true;
  } catch (error) {
    console.error('[Trading Service] Server health check failed:', error);
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

    // Wait for XTB server to be healthy
    for (let i = 0; i < MAX_RETRIES; i++) {
      const isHealthy = await checkServerHealth();
      if (isHealthy) {
        console.log('[Trading Service] XTB server is healthy, proceeding with login');
        break;
      }
      if (i < MAX_RETRIES - 1) {
        console.log(`[Trading Service] XTB server not ready, retrying in ${RETRY_DELAY}ms...`);
        await wait(RETRY_DELAY);
      } else {
        throw new Error('XTB server is not available');
      }
    }

    console.log('[Trading Service] Logging in...');
    await this.login();
  }

  private async login(): Promise<void> {
    try {
      console.log('[Trading Service] Sending login request to XTB server');
      
      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: process.env.XTB_USER_ID || '17535100',
          password: process.env.XTB_PASSWORD || 'GuiZarHoh2711!'
        })
      });

      if (!response.ok) {
        console.error('[Trading Service] Login failed with status:', response.status);
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json() as { status: boolean; streamSessionId?: string };
      console.log('[Trading Service] Login response:', data);
      
      if (!data.status) {
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

  async executeHedge(hedgeParams: { 
    symbol: string; 
    volume: number; 
    targetRate: number; 
    direction: 'buy' | 'sell' 
  }): Promise<{ success: boolean; orderId?: number; message: string }> {
    try {
      await this.ensureLoggedIn();
      
      const { symbol, volume, targetRate, direction } = hedgeParams;
      console.log('[Trading Service] Executing hedge with params:', hedgeParams);

      // Map direction to XTB command (0 for BUY, 1 for SELL)
      const cmd = direction === 'buy' ? 0 : 1;
      
      // Convert to XTB trade transaction format
      const tradeTransaction = {
        cmd,
        symbol,
        volume: volume / 100000, // Convert to lots (1 lot = 100,000 units)
        price: targetRate,
        offset: 0,
        order: 0
      };
      
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo: tradeTransaction
          }
        })
      });

      if (!response.ok) {
        console.error('[Trading Service] Hedge execution failed with status:', response.status);
        throw new Error(`Hedge execution failed with status ${response.status}`);
      }

      const data = await response.json() as XTBApiResponse;
      console.log('[Trading Service] Hedge executed successfully:', data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Hedge execution failed');
      }
      
      // Extract order number from response
      const orderId = data.returnData?.order;
      
      return {
        success: true,
        orderId,
        message: 'Hedge executed successfully'
      };
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
      throw error;
    }
  }

  async getSymbolData(symbol: string): Promise<{ status: boolean; returnData: any }> {
    try {
      await this.ensureLoggedIn();

      console.log(`[Trading Service] Getting symbol data for ${symbol}`);

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "getSymbol",
          arguments: {
            symbol
          }
        })
      });

      if (!response.ok) {
        console.error('[Trading Service] Symbol data fetch failed with status:', response.status);
        throw new Error(`Symbol data fetch failed with status ${response.status}`);
      }

      const data = await response.json() as XTBApiResponse;
      console.log(`[Trading Service] Symbol data for ${symbol}:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || `Failed to get data for ${symbol}`);
      }
      
      // Transform response to match the expected format
      return {
        status: true,
        returnData: data.returnData
      };
    } catch (error) {
      console.error('[Trading Service] Symbol data error:', error);
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

      // Create trade transaction info
      const tradeTransInfo = {
        cmd: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
        symbol,
        volume: finalVolume,
        price: price,  // Must be a valid price, not 0
        offset: 0,
        sl: sl,        // Stop loss
        tp: tp,        // Take profit
        type: 0,       // 0 for OPEN
        order: 0
      };

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo
          }
        })
      });

      if (!response.ok) {
        console.error('[Trading Service] Trade opening failed with status:', response.status);
        throw new Error(`Trade opening failed with status ${response.status}`);
      }

      const data = await response.json() as XTBApiResponse;
      console.log(`[Trading Service] Trade opening response:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Trade opening failed');
      }

      const orderId = data.returnData?.order;
      console.log(`[Trading Service] Trade opened. Order number: ${orderId}`);
      
      if (!orderId) {
        throw new Error('No order ID received from API');
      }
      
      return orderId;
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

      // Create trade transaction info for closing
      const tradeTransInfo = {
        cmd: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
        symbol,
        volume: finalVolume,
        price: price,
        customComment: "Close trade",
        expiration: 0,
        offset: 0,
        order: positionToClose,
        type: 2  // 2 for CLOSE
      };

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "tradeTransaction",
          arguments: {
            tradeTransInfo
          }
        })
      });

      if (!response.ok) {
        console.error('[Trading Service] Trade closing failed with status:', response.status);
        throw new Error(`Trade closing failed with status ${response.status}`);
      }

      const data = await response.json() as XTBApiResponse;
      console.log(`[Trading Service] Trade closing response:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Trade closing failed');
      }

      const orderId = data.returnData?.order;
      console.log(`[Trading Service] Trade closed. Order number: ${orderId}`);
      
      if (!orderId) {
        throw new Error('No order ID received from API');
      }
      
      return orderId;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      // Get all open trades
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
        console.error('[Trading Service] Trade status check failed with status:', response.status);
        throw new Error(`Trade status check failed with status ${response.status}`);
      }

      const data = await response.json() as XTBApiResponse;
      console.log(`[Trading Service] Open trades response:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Failed to get trade status');
      }

      // Find the specific trade
      const trades = data.returnData || [];
      const trade = trades.find((t: any) => t.order === tradeNumber || t.position === tradeNumber);
      
      if (trade) {
        return {
          success: true,
          status: true,
          orderId: tradeNumber,
          message: 'Trade is open',
          returnData: trade
        };
      } else {
        // If not found in open trades, it might be closed
        return {
          success: true,
          status: false,
          orderId: tradeNumber,
          message: 'Trade is closed or not found'
        };
      }
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }


}



// Export a singleton instance
export const tradingService = new TradingService();