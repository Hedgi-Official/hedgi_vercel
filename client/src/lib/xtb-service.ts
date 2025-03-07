import type { XTBCredentials, XTBResponse, SymbolRecord, CandleStreamResponse } from './xtb-types';

/**
 * IMPORTANT: THIS SERVICE IS FOR DISPLAY PURPOSES ONLY
 * All trading operations must go through the Flask server at http://3.147.6.168
 * Do not use any methods in this service for actual trading!
 */
export class XTBService {
  private ws: WebSocket | null = null;
  private streamWs: WebSocket | null = null;
  private _isConnected = false;
  private streamSessionId: string | null = null;
  private streamListeners: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isReconnecting = false;

  constructor(
    // Use REST API fallback instead of direct WebSocket connection for better compatibility
    public useRestApiFallback = true,
    public serverUrl = 'wss://ws.xtb.com/demo',
    public streamUrl = 'wss://ws.xtb.com/demoStream'
  ) {
    // Initialize connection with a delay to prevent connection issues during page load
    setTimeout(() => this.initializeConnection(), 1000);
  }

  private async initializeConnection() {
    try {
      console.log('[XTB] Initializing connection...');
      // Use demo credentials for display-only functionality
      await this.connect({
        userId: "17535100",
        password: "GuiZarHoh2711!"
      });
    } catch (error) {
      console.error('[XTB] Initial connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[XTB] Max reconnection attempts reached');
      return;
    }

    console.log(`[XTB] Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${this.reconnectDelay}ms`);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.initializeConnection();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts)); // Exponential backoff
  }

  get isConnected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  private async sendCommand(cmd: string, args: any = {}): Promise<XTBResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.initializeConnection();
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('Not connected to XTB');
      }
    }

    return new Promise((resolve, reject) => {
      const message = JSON.stringify({
        command: cmd,
        arguments: args
      });

      console.log('[XTB] Sending command:', cmd, 'with args:', args);
      this.ws!.send(message);

      const handleMessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data) as XTBResponse;
          console.log('[XTB] Received response for', cmd, ':', response);
          this.ws!.removeEventListener('message', handleMessage);

          if (!response.status) {
            reject(new Error(response.errorDescr || 'Unknown error'));
          } else {
            resolve(response);
          }
        } catch (e) {
          console.error('[XTB] Error parsing response:', e);
          reject(e);
        }
      };

      this.ws!.addEventListener('message', handleMessage);

      setTimeout(() => {
        this.ws!.removeEventListener('message', handleMessage);
        reject(new Error(`Command ${cmd} timed out after 10s`));
      }, 10000);
    });
  }

  async connect(credentials: XTBCredentials): Promise<void> {
    if (this.isConnected) {
      console.log('[XTB] Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('[XTB] Connecting to main socket...');
      this.ws = new WebSocket(this.serverUrl);

      const connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout after 10s'));
        this.ws?.close();
      }, 10000);

      this.ws.addEventListener('open', async () => {
        try {
          console.log('[XTB] Main socket connected, attempting login...');
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password,
            appName: "Hedgi"
          });

          console.log('[XTB] Login response:', response);
          clearTimeout(connectionTimeout);

          if (response.streamSessionId) {
            this.streamSessionId = response.streamSessionId;
            this._isConnected = true;
            this.reconnectAttempts = 0; // Reset reconnect counter on successful connection
            await this.setupStreamingConnection();
            resolve();
          } else {
            reject(new Error('No streamSessionId received'));
          }
        } catch (error) {
          console.error('[XTB] Login error:', error);
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });

      this.ws.addEventListener('error', (error) => {
        console.error('[XTB] Main socket error:', error);
        clearTimeout(connectionTimeout);
        reject(new Error('WebSocket connection failed'));
      });

      this.ws.addEventListener('close', () => {
        console.log('[XTB] Main socket closed');
        clearTimeout(connectionTimeout);
        this._isConnected = false;
        this.streamSessionId = null;
        this.scheduleReconnect();
      });
    });
  }

  async getSymbolData(symbol: string): Promise<XTBResponse> {
    // First try to get data from our backend API if direct WebSocket connection fails
    if (this.useRestApiFallback || !this.isConnected) {
      try {
        console.log('[XTB] Fetching symbol data from backend API for:', symbol);
        const response = await fetch('/api/xtb/rates');
        
        if (response.ok) {
          const rates = await response.json();
          const symbolData = rates.find((rate: any) => rate.symbol === symbol);
          
          if (symbolData) {
            console.log('[XTB] Symbol data from API for', symbol, ':', symbolData);
            return {
              status: true,
              returnData: {
                symbol: symbolData.symbol,
                bid: symbolData.bid,
                ask: symbolData.ask,
                time: symbolData.timestamp,
                swapLong: Math.abs(symbolData.swapLong || 0),
                swapShort: Math.abs(symbolData.swapShort || 0)
              }
            };
          }
        }
      } catch (error) {
        console.error('[XTB] Error fetching symbol data from API:', error);
        // Continue to try direct connection if API fails
      }
    }

    // Fallback to direct WebSocket connection if API fails or useRestApiFallback is false
    if (!this.isConnected) {
      try {
        await this.initializeConnection();
      } catch (error) {
        console.error('[XTB] Failed to initialize connection:', error);
        // Return a simulated response with fallback data
        return this.getFallbackData(symbol);
      }
    }

    try {
      console.log('[XTB] Fetching symbol data via WebSocket for:', symbol);
      const response = await this.sendCommand('getSymbol', { symbol });

      if (!response.status) {
        throw new Error(response.errorDescr || 'Failed to get symbol data');
      }

      if (response.returnData) {
        response.returnData.swapLong = Math.abs(response.returnData.swapLong);
        response.returnData.swapShort = Math.abs(response.returnData.swapShort);
      }

      console.log('[XTB] Symbol data response for', symbol, ':', response);
      return response;
    } catch (error) {
      console.error('[XTB] Error fetching symbol data via WebSocket:', error);
      // Return fallback data if WebSocket fails
      return this.getFallbackData(symbol);
    }
  }
  
  // Helper method to generate fallback data when all methods fail
  private getFallbackData(symbol: string): XTBResponse {
    console.log('[XTB] Using fallback data for', symbol);
    
    // Default fallback rates
    const fallbackRates: Record<string, any> = {
      'USDBRL': { bid: 5.67, ask: 5.69, swapLong: 0.0002, swapShort: 0.0001 },
      'EURUSD': { bid: 1.08, ask: 1.09, swapLong: 0.0001, swapShort: 0.0002 },
      'USDMXN': { bid: 16.75, ask: 16.78, swapLong: 0.0001, swapShort: 0.0001 }
    };
    
    const rate = fallbackRates[symbol] || { bid: 1.0, ask: 1.01, swapLong: 0.0001, swapShort: 0.0001 };
    
    return {
      status: true,
      returnData: {
        symbol,
        bid: rate.bid,
        ask: rate.ask,
        time: Date.now(),
        swapLong: rate.swapLong,
        swapShort: rate.swapShort
      }
    };
  }

  async checkStreamConnection(): Promise<boolean> {
    if (!this.streamWs || this.streamWs.readyState !== WebSocket.OPEN) {
      console.log('[XTB] Stream connection not ready, attempting setup...');
      try {
        await this.setupStreamingConnection();
      } catch (error) {
        console.error('[XTB] Failed to setup streaming connection:', error);
        return false;
      }
    }
    return this.streamWs?.readyState === WebSocket.OPEN;
  }

  private async setupStreamingConnection(): Promise<void> {
    if (!this.streamSessionId) {
      console.error('[XTB] No streamSessionId available for streaming connection');
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('[XTB] Setting up streaming connection...');
      this.streamWs = new WebSocket(this.streamUrl);

      const connectionTimeout = setTimeout(() => {
        reject(new Error('Streaming connection timeout after 10s'));
        this.streamWs?.close();
      }, 10000);

      this.streamWs.addEventListener('open', () => {
        console.log('[XTB] Streaming connection established');
        clearTimeout(connectionTimeout);
        resolve();
      });

      this.streamWs.addEventListener('error', (error) => {
        console.error('[XTB] Streaming socket error:', error);
        clearTimeout(connectionTimeout);
        reject(new Error('Streaming WebSocket connection failed'));
      });

      this.streamWs.addEventListener('close', () => {
        console.log('[XTB] Streaming connection closed');
        clearTimeout(connectionTimeout);
        // Try to reconnect streaming connection
        setTimeout(() => this.setupStreamingConnection(), 5000);
      });
    });
  }

  onSymbolUpdate(symbol: string, callback: (data: any) => void) {
    this.streamListeners.set(symbol, callback);
  }

  disconnect(): void {
    console.log('[XTB] Disconnecting...');

    if (this.streamWs) {
      this.streamWs.close();
      this.streamWs = null;
    }

    if (this.ws) {
      this.sendCommand('logout').catch(console.error);
      this.ws.close();
      this.ws = null;
    }

    this._isConnected = false;
    this.streamSessionId = null;
    this.streamListeners.clear();
  }
}

// Create singleton instance
export const xtbService = new XTBService();