import fetch from 'node-fetch';

// Define interfaces for API interactions
interface XTBResponse {
  status: boolean;
  returnData?: any;
  errorCode?: string;
  errorDescr?: string;
  streamSessionId?: string;
}

interface XTBLoginResponse {
  status: boolean;
  streamSessionId?: string;
  errorCode?: string;
  errorDescr?: string;
}

interface XTBTradeResponse {
  status: boolean;
  returnData?: {
    order: number;
  };
  errorCode?: string;
  errorDescr?: string;
}

interface XTBCommandResponse {
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
  price: number;
  sl?: number;      // Stop loss
  tp?: number;      // Take profit
  symbol: string;
  type?: number;    // 0 for open, 2 for close
  volume: number;
  offset?: number;
}

// Server URL for the external XTB Flask service
const XTB_SERVER_URL = 'http://3.147.6.168';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class TradingService {
  private streamSessionId: string | null = null;
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
          userId: 17535100, // Use the numeric ID that works with the API
          password: process.env.XTB_PASSWORD ? process.env.XTB_PASSWORD.trim() : ''
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Trading Service] Login failed with status: ${response.status}, body: ${errorText}`);
        throw new Error(`Login failed with status: ${response.status}`);
      }

      const data = await response.json() as XTBLoginResponse;
      if (!data.status) {
        throw new Error('Login failed: ' + (data.errorDescr || 'Unknown error'));
      }

      this.streamSessionId = data.streamSessionId || null;
      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in with session ID:', this.streamSessionId);
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }

  async executeHedge(hedgeParams: any): Promise<any> {
    try {
      await this.ensureLoggedIn();
      console.log('[Trading Service] Executing hedge with params:', hedgeParams);
      
      // Create a trade based on hedge parameters
      const { symbol, volume, direction } = hedgeParams;
      const isBuy = direction === 'buy';
      
      const orderNumber = await this.openTrade(
        symbol,
        0, // price will be determined by the market
        volume,
        isBuy
      );
      
      return {
        success: true,
        orderId: orderNumber,
        message: `Hedge position opened for ${symbol}, direction: ${direction}, volume: ${volume}`
      };
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
      throw error;
    }
  }

  async getSymbolData(symbol: string): Promise<XTBCommandResponse> {
    try {
      await this.ensureLoggedIn();
      console.log(`[Trading Service] Getting symbol data for ${symbol}`);

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: 'getSymbol',
          arguments: {
            symbol: symbol
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Trading Service] Failed to get symbol data with status: ${response.status}, body: ${errorText}`);
        throw new Error(`Failed to get symbol data with status: ${response.status}`);
      }

      const data = await response.json() as XTBCommandResponse;
      return data;
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

      // Create trade transaction info based on XTB API requirements
      const tradeTransInfo: TradeTransInfo = {
        cmd: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
        symbol: symbol,
        volume: finalVolume,
        price: price || 0,
        offset: 0,
        order: 0  // For opening a position
      };

      // Add optional parameters only if they have values
      if (customComment) tradeTransInfo.customComment = customComment;
      if (expiration > 0) tradeTransInfo.expiration = expiration;
      if (sl > 0) tradeTransInfo.sl = sl;
      if (tp > 0) tradeTransInfo.tp = tp;

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: 'tradeTransaction',
          arguments: {
            tradeTransInfo: tradeTransInfo
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Trading Service] Trade failed with status: ${response.status}, body: ${errorText}`);
        throw new Error(`Trade failed with status: ${response.status}`);
      }

      const data = await response.json() as XTBTradeResponse;
      if (!data.status) {
        throw new Error('Trade failed: ' + (data.errorDescr || 'Unknown error'));
      }

      // Extract the order number from the returnData
      const orderNumber = data.returnData?.order;
      if (!orderNumber) {
        throw new Error('Trade completed but no order number was returned');
      }
      
      console.log(`[Trading Service] Trade opened. Order number: ${orderNumber}`);
      return orderNumber;
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
    customComment: string = "Close trade",
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

      // The order to close will be positionToClose + 1 based on the API example
      const orderToClose = positionToClose + 1;

      // Create trade transaction info for closing a position
      const tradeTransInfo: TradeTransInfo = {
        cmd: isBuy ? 0 : 1,  // 0 for BUY, 1 for SELL
        customComment: customComment,
        expiration: expiration,
        order: orderToClose,
        price: price || 0, 
        symbol: symbol,
        type: 2,  // 2 for CLOSE
        volume: finalVolume,
        offset: 0
      };

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: 'tradeTransaction',
          arguments: {
            tradeTransInfo: tradeTransInfo
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Trading Service] Close trade failed with status: ${response.status}, body: ${errorText}`);
        throw new Error(`Close trade failed with status: ${response.status}`);
      }

      const data = await response.json() as XTBTradeResponse;
      if (!data.status) {
        throw new Error('Close trade failed: ' + (data.errorDescr || 'Unknown error'));
      }

      // Extract the order number from the returnData
      const orderNumber = data.returnData?.order;
      if (!orderNumber) {
        throw new Error('Trade closing completed but no order number was returned');
      }
      
      console.log(`[Trading Service] Trade closed. Order number: ${orderNumber}`);
      return orderNumber;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBCommandResponse> {
    try {
      await this.ensureLoggedIn();
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: 'getTrades',
          arguments: {
            openedOnly: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Trading Service] Status check failed with status: ${response.status}, body: ${errorText}`);
        throw new Error(`Status check failed with status: ${response.status}`);
      }

      const data = await response.json() as XTBCommandResponse;
      if (!data.status) {
        throw new Error('Status check failed: ' + (data.errorDescr || 'Unknown error'));
      }

      console.log(`[Trading Service] Trade status response:`, data);
      
      // Filter trades to find the one matching our order number
      const trades = data.returnData || [];
      const targetTrade = trades.find((t: any) => t.order === tradeNumber || t.position === tradeNumber);
      
      if (targetTrade) {
        return {
          status: true,
          returnData: targetTrade
        };
      }
      
      // If not found in open trades, it might be closed
      return {
        status: true,
        returnData: null
      };
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();