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

  constructor(
    public serverUrl = 'wss://ws.xtb.com/demo',
    public streamUrl = 'wss://ws.xtb.com/demoStream'
  ) {
    // Don't initialize connection automatically
    // This prevents infinite reconnection attempts
  }

  private async initializeConnection() {
    try {
      console.log('[XTB] Initializing connection...');
      // We'll supply credentials from the component instead of hardcoding here
      if (this.ws) {
        console.log('[XTB] Existing connection found, closing before reconnect');
        try {
          this.ws.close();
          this.ws = null;
        } catch (e) {
          console.warn('[XTB] Error closing existing connection:', e);
        }
      }
      // Connection will be established when explicitly called
    } catch (error) {
      console.error('[XTB] Connection initialization failed:', error);
      // Don't auto-reconnect here
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
      throw new Error('Not connected to XTB. Please connect before sending commands.');
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
        // Don't automatically reconnect - the component will handle reconnection if needed
      });
    });
  }

  async getSymbolData(symbol: string): Promise<XTBResponse> {
    if (!this.isConnected) {
      throw new Error('Not connected to XTB service. Please connect first.');
    }

    try {
      console.log('[XTB] Fetching symbol data for:', symbol);
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
      console.error('[XTB] Error fetching symbol data for', symbol, ':', error);
      throw error;
    }
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
        // Don't automatically reconnect - let component handle reconnection
      });
    });
  }

  onSymbolUpdate(symbol: string, callback: (data: any) => void) {
    this.streamListeners.set(symbol, callback);
  }

  disconnect(): void {
    console.log('[XTB] Disconnecting...');

    if (this.streamWs) {
      try {
        this.streamWs.close();
      } catch (e) {
        console.warn('[XTB] Error closing stream connection:', e);
      }
      this.streamWs = null;
    }

    if (this.ws) {
      // Only try to logout if we're connected
      if (this._isConnected && this.ws.readyState === WebSocket.OPEN) {
        try {
          // Don't wait for response, just send the command
          this.ws.send(JSON.stringify({
            command: 'logout',
            arguments: {}
          }));
        } catch (e) {
          console.warn('[XTB] Error sending logout command:', e);
        }
      }
      
      try {
        this.ws.close();
      } catch (e) {
        console.warn('[XTB] Error closing connection:', e);
      }
      this.ws = null;
    }

    this._isConnected = false;
    this.streamSessionId = null;
    this.streamListeners.clear();
    
    console.log('[XTB] Disconnected successfully');
  }
}

// Create singleton instance
export const xtbService = new XTBService();