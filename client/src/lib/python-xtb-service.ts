
/**
 * PythonXTBService - Service for interacting with the Python XTB API
 * This service makes calls to the Flask API that wraps the Python XTB implementation
 */

interface XTBCredentials {
  userId: string;
  password: string;
  appName?: string;
}

interface TradeData {
  symbol: string;
  cmd: number; // 0 for BUY, 1 for SELL
  volume: number;
  comment?: string;
  tp?: number; // Take profit
  sl?: number; // Stop loss
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string | number;
}

export class PythonXTBService {
  private apiBaseUrl: string;

  constructor(baseUrl = '') {
    // Default to the current host if no base URL is provided
    this.apiBaseUrl = baseUrl || `${window.location.protocol}//${window.location.hostname}:8080`;
  }

  /**
   * Check the health of the XTB connection
   */
  async checkHealth(): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_health`);
      return await response.json();
    } catch (error) {
      console.error('Error checking XTB health:', error);
      return { success: false, error: 'Failed to check XTB health' };
    }
  }

  /**
   * Connect to the XTB API
   */
  async connect(credentials: XTBCredentials): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      return await response.json();
    } catch (error) {
      console.error('Error connecting to XTB:', error);
      return { success: false, error: 'Failed to connect to XTB' };
    }
  }

  /**
   * Disconnect from the XTB API
   */
  async disconnect(): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_disconnect`, {
        method: 'POST',
      });
      return await response.json();
    } catch (error) {
      console.error('Error disconnecting from XTB:', error);
      return { success: false, error: 'Failed to disconnect from XTB' };
    }
  }

  /**
   * Get information about a symbol
   */
  async getSymbolInfo(symbol: string): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_symbol_info/${symbol}`);
      return await response.json();
    } catch (error) {
      console.error(`Error getting symbol info for ${symbol}:`, error);
      return { success: false, error: `Failed to get symbol info for ${symbol}` };
    }
  }

  /**
   * Get all available currency pairs
   */
  async getCurrencyPairs(): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_currency_pairs`);
      return await response.json();
    } catch (error) {
      console.error('Error getting currency pairs:', error);
      return { success: false, error: 'Failed to get currency pairs' };
    }
  }

  /**
   * Place a trade
   */
  async placeTrade(tradeData: TradeData): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_place_trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });
      return await response.json();
    } catch (error) {
      console.error('Error placing trade:', error);
      return { success: false, error: 'Failed to place trade' };
    }
  }

  /**
   * Check the status of a trade
   */
  async checkTradeStatus(orderId: number): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_trade_status/${orderId}`);
      return await response.json();
    } catch (error) {
      console.error(`Error checking trade status for order ${orderId}:`, error);
      return { success: false, error: `Failed to check trade status for order ${orderId}` };
    }
  }

  /**
   * Get all open trades
   */
  async getOpenTrades(): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_open_trades`);
      return await response.json();
    } catch (error) {
      console.error('Error getting open trades:', error);
      return { success: false, error: 'Failed to get open trades' };
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(positionId: number): Promise<APIResponse> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/xtb_close_trade/${positionId}`, {
        method: 'POST',
      });
      return await response.json();
    } catch (error) {
      console.error(`Error closing trade ${positionId}:`, error);
      return { success: false, error: `Failed to close trade ${positionId}` };
    }
  }
}

// Create a singleton instance for easy import
export const pythonXtbService = new PythonXTBService();
