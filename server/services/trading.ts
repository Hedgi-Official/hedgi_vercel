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

  // Helper method to process trade API responses
  private async processTradeResponse(response: any, isBuy: boolean, symbol: string): Promise<XTBResponse> {
    if (!response.ok) {
      return {
        status: false,
        error: `Trade failed with status ${response.status}`,
        message: `Trade execution failed with HTTP status ${response.status}`
      };
    }

    // First check if the response has a content-type header that indicates HTML
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const htmlText = await response.text();
      console.log('[Trading Service] Received HTML response instead of JSON:', 
                 htmlText.length > 300 ? htmlText.substring(0, 300) + '...' : htmlText);
      
      // Check if the HTML contains success indicators - more comprehensive check
      if (htmlText.toLowerCase().includes('success') || 
          htmlText.toLowerCase().includes('200 ok') || 
          htmlText.toLowerCase().includes('completed successfully')) {
        console.log('[Trading Service] HTML response indicates success, extracting order info if available');
        
        // Try to extract order info from HTML if possible - improved pattern matching
        let orderNumber = null;
        // Look for patterns like "order: 123456" or "order number: 123456" or similar
        const orderPatterns = [
          /order[^\d]*(\d+)/i,            // Basic "order 123456"
          /order\s*number[^\d]*(\d+)/i,    // "order number 123456"
          /transaction[^\d]*(\d+)/i,       // "transaction 123456"
          /trade[^\d]*(\d+)/i              // "trade 123456"
        ];
        
        for (const pattern of orderPatterns) {
          const match = htmlText.match(pattern);
          if (match && match[1]) {
            orderNumber = parseInt(match[1]);
            console.log(`[Trading Service] Extracted order number from HTML: ${orderNumber}`);
            break;
          }
        }
        
        return {
          status: true,
          returnData: { order: orderNumber || 0, htmlSuccess: true },
          message: `Successfully executed ${isBuy ? 'BUY' : 'SELL'} on ${symbol} (HTML response)`
        };
      } else {
        return {
          status: false,
          error: "Received HTML response from server without success indicators",
          message: `Failed to execute ${isBuy ? 'BUY' : 'SELL'} on ${symbol} - Server returned HTML`
        };
      }
    }

    // If not HTML, try to parse as JSON
    try {
      // First try to get the text to see what we're dealing with
      const textResponse = await response.text();
      console.log(`[Trading Service] Raw response for ${symbol}:`, 
                 textResponse.length > 300 ? textResponse.substring(0, 300) + '...' : textResponse);
      
      // If the response is empty or just whitespace or 'null', treat as success for close operations
      if (!textResponse || textResponse.trim() === '' || textResponse.trim() === 'null') {
        console.log('[Trading Service] Empty response received, treating as success for', symbol);
        return {
          status: true,
          returnData: { acknowledged: true, emptyResponse: true },
          message: `Operation appears to have succeeded for ${symbol} (empty response)`
        };
      }
      
      // Try to parse the text as JSON
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (parseError) {
        // If we get here, it's not HTML (checked earlier) and not valid JSON
        console.error('[Trading Service] Failed to parse response as JSON:', parseError);
        
        // Check if it might contain success indicators despite not being valid JSON
        if (textResponse.toLowerCase().includes('success') || 
            textResponse.toLowerCase().includes('200 ok') || 
            textResponse.toLowerCase().includes('completed')) {
          return {
            status: true,
            returnData: { acknowledged: true, textSuccess: true },
            message: `Operation likely succeeded for ${symbol} (non-JSON response with success indicators)`
          };
        }
        
        return {
          status: false,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          message: `Failed to execute ${isBuy ? 'BUY' : 'SELL'} on ${symbol} - Invalid response format`
        };
      }
      
      // Now we have valid JSON
      console.log('[Trading Service] Trade response:', data);

      if (!data.status) {
        return {
          status: false,
          error: data.errorDescr || data.error || "Unknown trading error",
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
      console.error('[Trading Service] Error parsing JSON response:', error);
      
      // Try to get the raw text to see what went wrong
      const text = await response.text().catch(() => "Could not get response text");
      console.error('[Trading Service] Raw response text:', text.substring(0, 200) + '...');
      
      return {
        status: false,
        error: `Error parsing response: ${error instanceof Error ? error.message : String(error)}`,
        message: `Failed to execute ${isBuy ? 'BUY' : 'SELL'} on ${symbol} - Response parsing error`
      };
    }
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

      // Create a fetch request with timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${XTB_SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

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
      // Ensure we're logged in
      const loggedIn = await this.ensureLoggedIn();
      if (!loggedIn) {
        return { 
          status: false, 
          error: "Failed to login before closing trade", 
          message: "Could not authenticate with trading service" 
        };
      }

      console.log(`[Trading Service] Closing trade ${orderNumber} (${symbol}, volume: ${volume})`);

      // Use orderNumber + 1 as required for closing trades
      const closeOrderNumber = orderNumber + 1;
      console.log(`[Trading Service] Using order number ${closeOrderNumber} (original + 1) to close trade`);

      // Create the request body exactly as specified in the curl example
      const requestBody = {
        "commandName": "tradeTransaction", 
        "arguments": {
          "tradeTransInfo": {
            "cmd": isBuy ? 0 : 1,      // Same direction as opening trade
            "customComment": customComment || "Close trade test",
            "expiration": 0,
            "offset": 0,
            "order": closeOrderNumber, // Order number + 1 for closing
            "price": 1.0,
            "symbol": symbol,
            "type": 2,                 // 2 for close
            "volume": volume           // Same volume as the trade being closed
          }
        }
      };

      console.log(`[Trading Service] Closing ${isBuy ? 'BUY' : 'SELL'} trade #${closeOrderNumber} for ${symbol} with volume ${volume}`);
      console.log('[Trading Service] Request body:', JSON.stringify(requestBody, null, 2));

      // Create a fetch request with timeout to avoid hanging indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      try {
        // Call the XTB API with the exact format required
        const response = await fetch(`${XTB_SERVER_URL}/command`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return await this.processTradeResponse(response, isBuy, symbol);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            status: false,
            error: `Close trade request timed out after ${API_TIMEOUT}ms`,
            message: `Close trade operation timed out. Please try again later.`
          };
        }
        throw error; // Re-throw other errors to be caught by the outer try-catch
      }
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