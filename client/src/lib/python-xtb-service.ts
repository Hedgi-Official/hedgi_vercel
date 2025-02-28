
import type { XTBResponse, SymbolRecord } from './xtb-types';

/**
 * Service for interacting with the Python XTB API backend
 */
export class PythonXTBService {
  private baseUrl: string;
  private _isConnected: boolean = false;

  constructor(baseUrl: string = '/api/xtb') {
    this.baseUrl = baseUrl;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to XTB through the Python backend
   */
  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      this._isConnected = data.status === true;
      return this._isConnected;
    } catch (error) {
      console.error('[Python XTB] Connection error:', error);
      this._isConnected = false;
      return false;
    }
  }

  /**
   * Disconnect from XTB
   */
  async disconnect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();
      this._isConnected = false;
      return data.status === true;
    } catch (error) {
      console.error('[Python XTB] Disconnect error:', error);
      this._isConnected = false;
      return false;
    }
  }

  /**
   * Check the health of the XTB connection
   */
  async checkHealth(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await fetch('/xtb_health');
      const data = await response.json();
      this._isConnected = data.connected === true;
      return {
        connected: data.connected === true,
        message: data.message,
      };
    } catch (error) {
      console.error('[Python XTB] Health check error:', error);
      this._isConnected = false;
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get symbol data
   */
  async getSymbolData(symbol: string): Promise<XTBResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/symbol/${symbol}`);
      const data = await response.json();

      if (data.status === true) {
        return {
          status: true,
          returnData: data.data as SymbolRecord,
        };
      } else {
        return {
          status: false,
          errorCode: 'API_ERROR',
          errorDescr: data.error,
        };
      }
    } catch (error) {
      console.error(`[Python XTB] Error getting symbol data for ${symbol}:`, error);
      return {
        status: false,
        errorCode: 'FETCH_ERROR',
        errorDescr: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a trade
   */
  async executeTrade(
    symbol: string,
    operation: 'buy' | 'sell',
    volume: number,
    options: {
      comment?: string;
      customComment?: string;
      stopLoss?: number;
      takeProfit?: number;
    } = {}
  ): Promise<XTBResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          operation,
          volume,
          ...options,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        return {
          status: true,
          returnData: data.data,
        };
      } else {
        return {
          status: false,
          errorCode: 'API_ERROR',
          errorDescr: data.error,
        };
      }
    } catch (error) {
      console.error('[Python XTB] Trade execution error:', error);
      return {
        status: false,
        errorCode: 'FETCH_ERROR',
        errorDescr: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all open trades
   */
  async getOpenTrades(): Promise<XTBResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/trades`);
      const data = await response.json();

      if (data.status === true) {
        return {
          status: true,
          returnData: data.data,
        };
      } else {
        return {
          status: false,
          errorCode: 'API_ERROR',
          errorDescr: data.error,
        };
      }
    } catch (error) {
      console.error('[Python XTB] Error getting open trades:', error);
      return {
        status: false,
        errorCode: 'FETCH_ERROR',
        errorDescr: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close a trade
   */
  async closeTrade(tradeId: number, volume: number = 0): Promise<XTBResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/trade/${tradeId}?volume=${volume}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.status === true) {
        return {
          status: true,
          returnData: data.data,
        };
      } else {
        return {
          status: false,
          errorCode: 'API_ERROR',
          errorDescr: data.error,
        };
      }
    } catch (error) {
      console.error(`[Python XTB] Error closing trade ${tradeId}:`, error);
      return {
        status: false,
        errorCode: 'FETCH_ERROR',
        errorDescr: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get latest prices for subscribed symbols
   */
  async getLatestPrices(symbols: string[] = ['USDBRL', 'EURUSD', 'USDMXN']): Promise<XTBResponse> {
    try {
      const symbolsParam = symbols.join(',');
      const response = await fetch(`${this.baseUrl}/prices?symbols=${symbolsParam}`);
      const data = await response.json();

      if (data.status === true) {
        return {
          status: true,
          returnData: data.data,
        };
      } else {
        return {
          status: false,
          errorCode: 'API_ERROR',
          errorDescr: data.error,
        };
      }
    } catch (error) {
      console.error('[Python XTB] Error getting latest prices:', error);
      return {
        status: false,
        errorCode: 'FETCH_ERROR',
        errorDescr: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create a singleton instance
export const pythonXtbService = new PythonXTBService();
