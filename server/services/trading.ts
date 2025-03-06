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
const API_TIMEOUT = 30000; // 30 seconds timeout for API calls (increased for slow server responses)

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// We're using regular fetch from node-fetch instead of a custom fetchWithTimeout

async function checkServerHealth(): Promise<boolean> {
  const startTime = Date.now();
  try {
    console.log('[Trading Service] Checking XTB server health');
    const response = await fetch(`${XTB_SERVER_URL}`);
    const duration = Date.now() - startTime;

    console.log(`[Trading Service] Server health check response: ${response.status} (${duration}ms)`);
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Trading Service] XTB server health check failed after ${duration}ms:`, error);
    return false;
  }
}

export class TradingService {
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes

  get isConnected(): boolean {
    const connected = this.isLoggedIn && (Date.now() - this.lastLoginTime < this.sessionTimeout);
    console.log(`[Trading Service] Connection status check: ${connected ? 'Connected' : 'Disconnected'}`);
    if (!connected) {
      console.log('[Trading Service] Session details:', {
        isLoggedIn: this.isLoggedIn,
        lastLoginTime: this.lastLoginTime,
        timeSinceLogin: Date.now() - this.lastLoginTime,
        sessionTimeout: this.sessionTimeout
      });
    }
    return connected;
  }

  // Helper method to process trade API responses
  private async processTradeResponse(response: any, isBuy: boolean, symbol: string): Promise<XTBResponse> {
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
  }

  private async login(): Promise<boolean> {
    const startTime = Date.now();
    try {
      console.log('[Trading Service] Attempting login...');

      const requestBody = {
        userId: 17535100,
        password: "GuiZarHoh2711!"
      };

      console.log('[Trading Service] Login request:', JSON.stringify(requestBody));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        console.error(`[Trading Service] Login failed with HTTP status ${response.status} after ${duration}ms`);
        return false;
      }

      const data = await response.json() as XTBResponse;
      console.log(`[Trading Service] Login response (${duration}ms):`, data);

      if (!data.status) {
        console.error(`[Trading Service] Login failed: ${data.errorDescr || 'Unknown reason'}`);
        return false;
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Trading Service] Login error after ${duration}ms:`, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  async connect(): Promise<boolean> {
    try {
      const startTime = Date.now();
      console.log('[Trading Service] Starting connection process');

      const loginSuccess = await this.login();
      const duration = Date.now() - startTime;

      console.log(`[Trading Service] Connection ${loginSuccess ? 'successful' : 'failed'} in ${duration}ms`);
      return loginSuccess;
    } catch (error) {
      console.error('[Trading Service] Connection error:', error);
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

      // Create a fetch request with timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        const response = await fetch(`${XTB_SERVER_URL}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tradeRequest),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return await this.processTradeResponse(response, isBuy, symbol);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            status: false,
            error: `Trade request timed out after ${API_TIMEOUT}ms`,
            message: `Trade execution timed out. Please try again later.`
          };
        }
        throw error; // Re-throw other errors to be caught by the outer try-catch
      }

      // This code is now handled in the processTradeResponse method
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
    customComment?: string
  ): Promise<XTBResponse> {
    try {
      // Ensure we're logged in first
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return {
          status: false,
          error: "Failed to login before closing trade",
          message: "Could not authenticate with trading service"
        };
      }

      // Use orderNumber + 1 as shown in the curl example
      const closeOrderNumber = orderNumber + 1;
      console.log(`[Trading Service] Closing trade using order number ${closeOrderNumber} (original + 1)`);

      // Exactly match the curl example format
      const requestBody = {
        "commandName": "tradeTransaction",
        "arguments": {
          "tradeTransInfo": {
            "cmd": isBuy ? 0 : 1,      // Keep original trade direction
            "customComment": customComment || "Close trade test",
            "expiration": 0,
            "offset": 0,
            "order": closeOrderNumber, // Order number + 1 for closing
            "price": 1.0,
            "symbol": symbol,
            "type": 2,                // 2 for close
            "volume": volume
          }
        }
      };

      console.log('[Trading Service] Close trade request:', JSON.stringify(requestBody, null, 2));

      // Execute the close trade command
      const response = await fetch(`${XTB_SERVER_URL}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Close trade failed with status ${response.status}`);
      }

      const data = await response.json() as XTBResponse;
      console.log('[Trading Service] Close trade response:', data);

      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || 'Failed to close trade',
          message: `Failed to close trade #${orderNumber}`
        };
      }

      return {
        status: true,
        returnData: data.returnData,
        message: `Successfully closed trade #${orderNumber}`
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

      // Create a fetch request with timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        // Fetch symbol data with proper format
        const response = await fetch(`${XTB_SERVER_URL}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commandName: "getSymbol",
            arguments: {
              symbol: symbol
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            status: false,
            error: `Symbol data request timed out after ${API_TIMEOUT}ms`,
            message: `Symbol data request timed out. Please try again later.`
          };
        }
        throw error; // Re-throw other errors to be caught by the outer try-catch
      }
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

      // Create a fetch request with timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        // Follow exact format from example
        const response = await fetch(`${XTB_SERVER_URL}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commandName: "getTrades",
            arguments: {
              openedOnly: true
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            status: false,
            error: `Trade status check timed out after ${API_TIMEOUT}ms`,
            message: `Trade status check timed out. Please try again later.`
          };
        }
        throw error; // Re-throw other errors to be caught by the outer try-catch
      }
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