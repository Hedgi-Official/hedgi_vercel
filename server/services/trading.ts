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

// External Flask server URL with port 5000 - this is required for connection
const XTB_SERVER_URL = 'http://3.147.6.168:5000';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const FETCH_TIMEOUT = 5000; // 5 seconds timeout for fetch requests

// Helper function to create fetch requests with a timeout
async function fetchWithTimeout(url: string, options: any, timeout = FETCH_TIMEOUT): Promise<any> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  }
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServerHealth(): Promise<boolean> {
  try {
    console.log('[Trading Service] Checking XTB server health');
    // Try to reach the server with a simple GET request to the root path
    // If the server is reachable but ping doesn't exist, it will return a 404, 
    // which is still a sign that the server is alive
    const response = await fetchWithTimeout(`${XTB_SERVER_URL}/ping`, {
      method: 'GET'
    }, 3000); // Use a shorter timeout for health checks
    
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

    // Wait for server to be healthy
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
      // Use the EXACT format from the sample file: userId as a number, not a string
      const userId = Number(process.env.XTB_USER_ID || '17535100');
      
      console.log(`[Trading Service] Attempting login with userId: ${userId} to ${XTB_SERVER_URL}/login`);
      
      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,  // Send as a number, not a string
          password: process.env.XTB_PASSWORD || 'GuiZarHoh2711!',
          appName: "Hedgi-Web"
        })
      });

      if (!response.ok) {
        console.error(`[Trading Service] Login response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Login failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Login response:`, data);
      
      if (!data.status) {
        throw new Error(`Login failed: ${data.errorDescr || 'Unknown error'}`);
      }
      
      console.log('[Trading Service] Login successful with external server');

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Login process completed');
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }


  async executeHedge(hedgeParams: any): Promise<any> {
    try {
      console.log('[Trading Service] Executing hedge with params:', hedgeParams);
      
      // This method is only used by the frontend simulation
      // It can be kept as is or modified to use the new XTB server
      // For now, we'll return a mock response
      
      return {
        success: true,
        message: "Hedge simulation completed",
        data: hedgeParams
      };
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
      throw error;
    }
  }

  async getSymbolData(symbol: string): Promise<any> {
    try {
      await this.ensureLoggedIn();

      console.log(`[Trading Service] Getting symbol data for ${symbol}`);

      // No simulation fallback anymore
      // Execute a command to get symbol data from the external server
      const response = await fetch(`${XTB_SERVER_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: "getSymbol",
          arguments: {
            symbol
          }
        })
      });

      if (!response.ok) {
        throw new Error('Symbol data fetch failed');
      }

      const data = await response.json() as XTBResponse;
      
      // Format the response to match what the rest of the app expects
      return {
        status: data.status,
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

      // Create trade transaction info matching EXACTLY the format from the example
      // Note: we're using the simpler format as per the curl example
      const tradeTransInfo: any = {
        cmd: isBuy ? 0 : 1,     // 0 for BUY, 1 for SELL
        symbol: symbol,
        volume: finalVolume,
        price: price || 0,       // Must be a valid price
        offset: 0,               // Required per example
        order: 0                 // Use 0 when opening a new trade
      };

      // Only add the optional parameters if they are provided
      if (sl && sl !== 0) tradeTransInfo.sl = sl;
      if (tp && tp !== 0) tradeTransInfo.tp = tp;
      if (customComment) tradeTransInfo.customComment = customComment;
      if (expiration && expiration !== 0) tradeTransInfo.expiration = expiration;

      // No simulation fallback anymore - we want to see real errors
      console.log(`[Trading Service] Sending open trade request to ${XTB_SERVER_URL}/execute:`, {
        command: "tradeTransaction", 
        arguments: tradeTransInfo
      });
      
      const response = await fetch(`${XTB_SERVER_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: "tradeTransaction",
          arguments: tradeTransInfo
        })
      });

      if (!response.ok) {
        console.error(`[Trading Service] Trade response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Trade response:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Trade failed');
      }

      console.log(`[Trading Service] Trade opened. Order number: ${data.returnData?.order}`);
      return data.returnData?.order || 0;
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

      // Create trade transaction info matching EXACTLY the format from the example for closing trades
      const tradeTransInfo = {
        cmd: isBuy ? 0 : 1,     // 0 for BUY, 1 for SELL
        symbol: symbol,
        volume: finalVolume,
        price: price || 0,
        offset: 0,
        order: Number(positionToClose) + 1,  // According to curl example, we need to use order + 1
        type: 2,                // 2 for close
        customComment: customComment || "Close trade test", // Default comment if none provided
        expiration: expiration || 0
      };

      // No simulation fallback anymore
      console.log(`[Trading Service] Sending close trade request to ${XTB_SERVER_URL}/execute:`, {
        command: "tradeTransaction", 
        arguments: tradeTransInfo
      });
      
      const response = await fetch(`${XTB_SERVER_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: "tradeTransaction",
          arguments: tradeTransInfo
        })
      });

      if (!response.ok) {
        console.error(`[Trading Service] Close trade response not OK: ${response.status} ${response.statusText}`);
        throw new Error(`Close trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Close trade response:`, data);
      
      if (!data.status) {
        throw new Error(data.errorDescr || 'Close trade failed');
      }

      console.log(`[Trading Service] Trade closed. Order number: ${data.returnData?.order}`);
      return data.returnData?.order || 0;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      // No simulation fallback anymore
      // Get active trades to find status from the external server
      const response = await fetch(`${XTB_SERVER_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: "getTrades",
          arguments: {
            openedOnly: true
          }
        })
      });

      if (!response.ok) {
        throw new Error('Status check failed');
      }

      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Trade status response:`, data);

      if (!data.status) {
        throw new Error(data.errorDescr || 'Status check failed');
      }

      // Find the trade with matching order number
      const trades = data.returnData || [];
      const trade = trades.find((t: any) => Number(t.order) === Number(tradeNumber));

      // Create response
      const result: XTBResponse = {
        status: true,
        returnData: trade || { status: 'NOT_FOUND', order: tradeNumber },
        message: trade ? 'Trade found' : 'Trade not found or closed'
      };

      return result;
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }


}



// Export a singleton instance
export const tradingService = new TradingService();