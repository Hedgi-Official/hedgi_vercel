import fetch, { Response } from 'node-fetch';
import AbortController from 'abort-controller';

// Constants for better performance, with increased timeouts
const API_TIMEOUT = 20000; // 20 seconds timeout for API calls
const LOGIN_TIMEOUT = 30000; // 30 seconds timeout for login
const MAX_RETRIES = 3; // Maximum number of retries for operations
const RETRY_DELAY = 2000; // Delay between retries in ms

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

// Helper for better error messages
function getErrorMessage(error: any): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
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
// Using port 5000 since that's the standard Flask port as shown in the documentation
const XTB_SERVER_URL = process.env.XTB_SERVER_URL || 'http://3.147.6.168:5000';

// Fallback parameters
const USE_FALLBACK = process.env.USE_XTB_FALLBACK === 'true' || false;
const MAX_CONNECTION_RETRIES = parseInt(process.env.XTB_MAX_RETRIES || '4', 10);

// Log configuration on startup
console.log(`[Trading Service] Configuration:
  Server URL: ${XTB_SERVER_URL}
  Use Fallback: ${USE_FALLBACK}
  Max Retries: ${MAX_CONNECTION_RETRIES}
`);

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function for API calls with advanced timeout and retry logic
async function callXTBApi<T>(
  endpoint: string,
  method: string,
  body: any,
  timeout: number = API_TIMEOUT,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any = null;
  
  // Exponential backoff with jitter for retries
  const getBackoffTime = (attempt: number) => {
    const baseDelay = RETRY_DELAY;
    const maxDelay = 15000; // 15 seconds max
    // Calculate exponential backoff with a small random jitter
    const expBackoff = Math.min(baseDelay * Math.pow(2, attempt) + (Math.random() * 1000), maxDelay);
    return expBackoff;
  };
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Increase timeout with each retry attempt
      const dynamicTimeout = timeout + (attempt * 5000); // Add 5s per retry
      const controller = new AbortController();
      
      // Set up timeout with logging
      const timeoutId = setTimeout(() => {
        console.warn(`[Trading Service] Request to ${endpoint} timed out after ${dynamicTimeout}ms`);
        controller.abort();
      }, dynamicTimeout);
      
      const startTime = Date.now();
      console.log(`[Trading Service] API call to ${endpoint} (Attempt ${attempt + 1}/${retries + 1}, timeout: ${dynamicTimeout}ms)`);
      
      // Try to detect if the network is down before making the request
      let isServerReachable = true;
      
      // Only check server health on retry attempts (not on first attempt)
      if (attempt > 0) {
        try {
          const healthController = new AbortController();
          const healthTimeoutId = setTimeout(() => healthController.abort(), 3000);
          
          console.log('[Trading Service] Checking server health before retry...');
          const healthCheck = await fetch(`${XTB_SERVER_URL}/health`, {
            method: 'GET',
            signal: healthController.signal
          }).catch(() => null);
          
          clearTimeout(healthTimeoutId);
          isServerReachable = !!healthCheck && healthCheck.ok;
          
          if (!isServerReachable) {
            console.warn('[Trading Service] Server health check failed, but attempting request anyway');
          }
        } catch (healthErr) {
          console.warn('[Trading Service] Server health check error:', getErrorMessage(healthErr));
          isServerReachable = false;
        }
      }
      
      // Proceed with the main request
      const response = await fetch(`${XTB_SERVER_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Retry-Attempt': String(attempt), // For debugging
          'X-Client-Timestamp': String(Date.now()) // For debugging
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[Trading Service] API call completed in ${duration}ms`);
      
      // Log slow responses for performance analysis
      if (duration > 5000) {
        console.warn(`[Trading Service] Slow API response (${duration}ms) for ${endpoint}`);
      }
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData: any;
        
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => null);
        } else {
          errorData = await response.text().catch(() => 'Failed to read error response');
        }
        
        // Different handling based on status code
        if (response.status >= 500) {
          console.error(`[Trading Service] Server error ${response.status}:`, errorData);
          throw new Error(`API server error ${response.status}: ${JSON.stringify(errorData)}`);
        } else if (response.status === 429) {
          // Rate limiting - use longer backoff
          console.warn(`[Trading Service] Rate limited (429). Will retry with longer backoff.`);
          await wait(getBackoffTime(attempt + 1)); // Use higher backoff for rate limits
          continue;
        } else if (response.status === 401) {
          // Authentication error - might need to re-login
          console.error(`[Trading Service] Authentication error (401):`, errorData);
          throw new Error(`Authentication error: ${JSON.stringify(errorData)}`);
        } else {
          console.error(`[Trading Service] API error ${response.status}:`, errorData);
          
          // Return a formatted error response instead of throwing
          return {
            status: false,
            errorCode: String(response.status),
            errorDescr: typeof errorData === 'string' ? errorData : JSON.stringify(errorData)
          } as unknown as T;
        }
      }
      
      // Successfully got response
      try {
        const jsonData = await response.json();
        return jsonData as T;
      } catch (jsonError) {
        console.error('[Trading Service] Failed to parse JSON response:', getErrorMessage(jsonError));
        throw new Error(`Failed to parse API response as JSON: ${getErrorMessage(jsonError)}`);
      }
    } catch (error) {
      lastError = error;
      const errorMsg = getErrorMessage(error);
      console.error(`[Trading Service] API call failed (attempt ${attempt + 1}/${retries + 1}):`, errorMsg);
      
      // Special handling for network errors
      const isNetworkError = 
        errorMsg.includes('ECONNREFUSED') || 
        errorMsg.includes('ETIMEDOUT') || 
        errorMsg.includes('network') ||
        errorMsg.includes('aborted');
        
      if (isNetworkError) {
        console.warn('[Trading Service] Network error detected, using longer backoff before retry');
      }
      
      // If this was the last attempt, throw the error
      if (attempt === retries) {
        // Wrap error with more context for debugging
        const contextError = new Error(`API call to ${endpoint} failed after ${retries + 1} attempts: ${errorMsg}`);
        (contextError as any).originalError = error;
        throw contextError;
      }
      
      // Wait before retrying, with exponential backoff
      const backoffTime = getBackoffTime(attempt);
      console.log(`[Trading Service] Retrying in ${Math.round(backoffTime / 1000)}s (backoff)`);
      await wait(backoffTime);
    }
  }
  
  // This should never be reached due to throw in the catch block above
  throw lastError || new Error(`Failed to call ${endpoint} after ${retries + 1} attempts for unknown reason`);
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
      
      // Use the callXTBApi helper with timeout and retry logic
      // Use the hardcoded password from the attached curl example for now
      const data = await callXTBApi<XTBLoginResponse>(
        '/login',
        'POST',
        {
          userId: 17535100, // Use the numeric ID that works with the API
          password: 'xoh74681' // Hardcoded for now based on curl example
        },
        LOGIN_TIMEOUT  // Use longer timeout for login
      );
      
      if (!data.status) {
        throw new Error('Login failed: ' + (data.errorDescr || 'Unknown error'));
      }

      this.streamSessionId = data.streamSessionId || null;
      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in with session ID:', this.streamSessionId);
    } catch (error) {
      this.isLoggedIn = false;
      this.streamSessionId = null;
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

      // Use our improved API helper with timeout and retry
      const data = await callXTBApi<XTBCommandResponse>(
        '/command', 
        'POST',
        {
          commandName: 'getSymbol',
          arguments: {
            symbol: symbol
          }
        }
      );
      
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

      // Use our improved API helper with timeout and retry for trade execution
      const data = await callXTBApi<XTBTradeResponse>(
        '/command',
        'POST',
        {
          commandName: 'tradeTransaction',
          arguments: {
            tradeTransInfo: tradeTransInfo
          }
        }
      );
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

      // Use our improved API helper with timeout and retry for trade execution
      const data = await callXTBApi<XTBTradeResponse>(
        '/command',
        'POST',
        {
          commandName: 'tradeTransaction',
          arguments: {
            tradeTransInfo: tradeTransInfo
          }
        }
      );
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

      // Use our improved API helper with timeout and retry
      const data = await callXTBApi<XTBCommandResponse>(
        '/command',
        'POST',
        {
          commandName: 'getTrades',
          arguments: {
            openedOnly: true
          }
        }
      );
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