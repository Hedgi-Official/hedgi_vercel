import fetch from 'node-fetch';

// Define consistent types for API interactions
interface XTBResponse {
  status: boolean;
  returnData?: any;
  error?: string;
  errorDescr?: string;
  message?: string;
}

interface SymbolData {
  bid: number;
  ask: number;
  high: number;
  low: number;
  time: number;
  swapLong: number;
  swapShort: number;
  [key: string]: any;
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
  // Avoid using AbortController with node-fetch directly as it causes type conflicts
  // Instead just use a simple timeout promise
  const fetchPromise = fetch(url, options);
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`Request to ${url} timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    // Race between the fetch and the timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
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

  private async login(): Promise<boolean> {
    try {
      console.log('[Trading Service] Attempting login...');

      // CRITICAL: Exactly match the format shown in the example curl command
      // The userId MUST be a number, not a string
      // curl -X POST -H "Content-Type: application/json" -d '{"userId": 17535100, "password": "YourPasswordHere"}'
      const requestBody = {
        userId: 17535100,  // Must be a number, not a string
        password: "GuiZarHoh2711!"
      };
      
      console.log('[Trading Service] Login request:', JSON.stringify(requestBody));
      
      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error(`[Trading Service] Login failed with HTTP status ${response.status}`);
        return false;
      }

      // Parse the response exactly as shown in the example:
      // {"status": true, "streamSessionId": "005056fffeb9ce40-00060436-04e45802-85fa7c837b6a54da-15996a54"}
      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Login response:', data);

      if (!data.status) {
        console.error(`[Trading Service] Login failed: ${data.errorDescr || 'Unknown reason'}`);
        return false;
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      return true;
    } catch (error) {
      console.error('[Trading Service] Login error:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async connect(): Promise<boolean> {
    try {
      return await this.login();
    } catch (error) {
      console.error('[Trading Service] Connection error:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  private async ensureLoggedIn(): Promise<boolean> {
    if (!this.isLoggedIn || (Date.now() - this.lastLoginTime >= this.sessionTimeout)) {
      return await this.login();
    }
    return true;
  }

  async openTrade(
    symbol: string,
    volume: number,
    isBuy: boolean,
    customComment: string = ''
  ): Promise<XTBResponse> {
    try {
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return {
          status: false,
          error: "Not logged in to trading service",
          message: "Failed to authenticate with trading service"
        };
      }

      console.log(`[Trading Service] Opening ${isBuy ? 'BUY' : 'SELL'} trade for ${symbol}, volume ${volume}`);

      // CRITICAL: Exactly match the format from the example curl command:
      // curl -X POST -H "Content-Type: application/json" \
      // -d '{"commandName": "tradeTransaction", "arguments": {"tradeTransInfo": {"cmd": 0, "symbol": "EURUSD", "volume": 0.2, "price": 1.0, "offset": 0, "order": 0}}}' \
      
      // Build trade info exactly as shown in example
      const tradeTransInfo: any = {
        cmd: isBuy ? 0 : 1,     // 0 for BUY, 1 for SELL
        symbol: symbol,
        volume: volume,         // Volume is already in lots (0.1 = 10,000 units)
        price: 1.0,             // Must be 1.0 as in example, not 0
        offset: 0,
        order: 0                // 0 for new trades
      };
      
      // Add customComment only if provided (not in the minimal example)
      if (customComment) {
        tradeTransInfo.customComment = customComment;
      }
      
      // Add type only if needed (not in the minimal example)
      if (true) { // Always include type for consistency 
        tradeTransInfo.type = 0; // 0 for open
      }
      
      const tradeRequest = {
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo: tradeTransInfo
        }
      };
      
      console.log(`[Trading Service] Sending trade request:`, JSON.stringify(tradeRequest));
      
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeRequest)
      });

      if (!response.ok) {
        return {
          status: false,
          error: `Trade failed with status ${response.status}`,
          message: `Trade execution failed with HTTP status ${response.status}`
        };
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Trade response:', data);

      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || "Unknown trading error",
          errorDescr: data.errorDescr || "Trade execution failed",
          message: `Failed to execute ${isBuy ? 'BUY' : 'SELL'} on ${symbol}`
        };
      }

      // Make sure we properly extract and format order information
      const orderInfo = data.returnData && typeof data.returnData === 'object' ? 
                       data.returnData : { order: null };
                       
      console.log('[Trading Service] Extracted order info:', orderInfo);
      
      return {
        status: true,
        returnData: orderInfo,
        message: `Successfully executed ${isBuy ? 'BUY' : 'SELL'} on ${symbol}`
      };
    } catch (error) {
      console.error('[Trading Service] Trade execution error:', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : "Unknown trading error",
        errorDescr: error instanceof Error ? error.message : "Trade execution failed",
        message: `Failed to execute ${isBuy ? 'BUY' : 'SELL'} on ${symbol}`
      };
    }
  }

  async closeTrade(
    symbol: string,
    orderNumber: number,
    volume: number,
    isBuy: boolean,
    customComment: string = "Closing hedge position"
  ): Promise<XTBResponse> {
    try {
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return {
          status: false,
          error: "Not logged in to trading service",
          message: "Failed to authenticate with trading service"
        };
      }

      console.log(`[Trading Service] Closing trade for order #${orderNumber} (${symbol})`);
      
      // CRITICAL: Match closing format exactly from example:
      // curl -X POST -H "Content-Type: application/json" \
      // -d '{"commandName": "tradeTransaction", "arguments": {"tradeTransInfo": {"cmd": 0, "customComment": "Close trade test", "expiration": 0, "offset": 0, "order": 751580917, "price": 1.0, "symbol": "EURUSD", "type": 2, "volume": 0.2}}}' \
      
      // Use a dynamic object to avoid TypeScript property errors
      const tradeTransInfo: any = {
        cmd: isBuy ? 0 : 1,      // Same direction as opening trade 
        customComment: customComment || "Close trade test",  // Added per example
        expiration: 0,           // Added per example - must be included
        offset: 0,               // Added per example - must be included
        order: orderNumber,      // Order number of the trade to close
        price: 1.0,              // Must be 1.0 per example
        symbol: symbol,
        type: 2,                 // 2 for close
        volume: volume           // Same volume as opening trade
      };
      
      // Note: customComment is already set above in the object literal
      
      const closeRequest = {
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo: tradeTransInfo
        }
      };
      
      console.log(`[Trading Service] Sending close request:`, JSON.stringify(closeRequest));
      
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeRequest)
      });

      if (!response.ok) {
        return {
          status: false,
          error: `Close trade failed with status ${response.status}`,
          message: `Trade closure failed with HTTP status ${response.status}`
        };
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Close trade response:', data);

      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || "Unknown trading error",
          errorDescr: data.errorDescr || "Trade closure failed",
          message: `Failed to close trade #${orderNumber} for ${symbol}`
        };
      }

      // Make sure we properly extract and format order information for closing trades too
      const orderInfo = data.returnData && typeof data.returnData === 'object' ? 
                       data.returnData : { order: null };
                       
      console.log('[Trading Service] Extracted close order info:', orderInfo);
      
      return {
        status: true,
        returnData: orderInfo,
        message: `Successfully closed trade #${orderNumber} for ${symbol}`
      };
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : "Unknown error closing trade",
        message: `Failed to close trade #${orderNumber} for ${symbol}`
      };
    }
  }

  async getSymbolData(symbol: string): Promise<XTBResponse> {
    try {
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return {
          status: false,
          error: "Not logged in to trading service",
          message: "Failed to authenticate with trading service"
        };
      }
      
      console.log(`[Trading Service] Getting symbol data for ${symbol}`);
      
      // Fetch symbol data with proper format
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandName: "getSymbol",
          arguments: {
            symbol: symbol
          }
        })
      });
      
      if (!response.ok) {
        return {
          status: false,
          error: `Symbol data request failed with status ${response.status}`,
          message: `Failed to fetch symbol data with HTTP status ${response.status}`
        };
      }
      
      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Symbol data response for ${symbol}:`, data);
      
      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || `Failed to get symbol data for ${symbol}`,
          message: `API rejected symbol data request for ${symbol}`
        };
      }
      
      return {
        status: true,
        returnData: data.returnData || null,
        message: `Symbol data retrieved for ${symbol}`
      };
    } catch (error) {
      console.error(`[Trading Service] Get symbol data error for ${symbol}:`, error);
      // Return a default error response instead of throwing
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Unknown error getting symbol data',
        message: `Failed to get symbol data for ${symbol}`
      };
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return {
          status: false,
          error: "Not logged in to trading service",
          message: "Failed to authenticate with trading service"
        };
      }

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
        return {
          status: false,
          error: `Status check failed with HTTP status ${response.status}`,
          message: `Failed to check trade status with HTTP status ${response.status}`
        };
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Trade status response:', data);

      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || 'Status check failed',
          message: `API rejected trade status request for order #${tradeNumber}`
        };
      }

      const trades = data.returnData || [];
      const trade = trades.find((t: any) => Number(t.order) === Number(tradeNumber));

      return {
        status: true,
        returnData: trade || { status: 'NOT_FOUND', order: tradeNumber },
        message: trade ? `Trade #${tradeNumber} found` : `Trade #${tradeNumber} not found or closed`
      };
    } catch (error) {
      console.error('[Trading Service] Status check error:', error);
      return {
        status: false,
        error: error instanceof Error ? error.message : 'Unknown error checking trade status',
        message: `Failed to check status for trade #${tradeNumber}`
      };
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();