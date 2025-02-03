import type { XTBCredentials, XTBResponse, SymbolRecord, CandleStreamResponse } from './xtb-types';

export class XTBService {
  private ws: WebSocket | null = null;
  private isConnected = false;

  constructor(
    private readonly serverUrl = 'wss://ws.xtb.com/demo',
    private readonly streamUrl = 'wss://ws.xtb.com/demoStream'
  ) {}

  private async sendCommand(cmd: string, args: any = {}): Promise<XTBResponse> {
    if (!this.ws) {
      throw new Error('Not connected to XTB');
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

      // Add timeout to prevent hanging
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
      this.ws = new WebSocket(this.serverUrl);

      this.ws.addEventListener('open', async () => {
        try {
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password,
            appName: "WebSocket Example"
          });

          if (response.status) {
            this.isConnected = true;
            resolve();
          } else {
            reject(new Error(response.errorDescr || 'Login failed'));
          }
        } catch (error) {
          reject(error);
        }
      });

      this.ws.addEventListener('error', () => {
        reject(new Error('WebSocket connection failed'));
      });

      this.ws.addEventListener('close', () => {
        this.isConnected = false;
      });
    });
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

      this.streamWs.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data) as CandleStreamResponse;
          console.log('[XTB] Streaming data received:', data);

          // If this is a candle update, notify listeners
          if (data.command === 'candle') {
            const listener = this.streamListeners.get(data.data.symbol);
            if (listener) {
              listener(data.data);
            }
          }
        } catch (error) {
          console.error('[XTB] Error parsing streaming data:', error);
        }
      });

      this.streamWs.addEventListener('error', (error) => {
        console.error('[XTB] Streaming socket error:', error);
        clearTimeout(connectionTimeout);
        reject(new Error('Streaming WebSocket connection failed'));
      });

      this.streamWs.addEventListener('close', () => {
        console.log('[XTB] Streaming connection closed');
        clearTimeout(connectionTimeout);
      });
    });
  }

  async checkStreamConnection(): Promise<boolean> {
    if (!this.streamWs || this.streamWs.readyState !== WebSocket.OPEN) {
      console.error('[XTB] Stream connection not ready');
      await this.setupStreamingConnection();
    }
    return this.streamWs?.readyState === WebSocket.OPEN;
  }

  async getAllSymbols(): Promise<SymbolRecord[]> {
    try {
      console.log('[XTB] Fetching all symbols...');
      const response = await this.sendCommand('getAllSymbols');
      console.log('[XTB] All symbols response:', response);
      return response.returnData;
    } catch (error) {
      console.error('[XTB] Error fetching symbols:', error);
      throw error;
    }
  }

  async getTickPrices(symbol: string): Promise<XTBResponse> {
    try {
      const response = await this.sendCommand('getTickPrices', {
        symbol,
        timestamp: Math.floor(Date.now() / 1000) - 60,
        level: 0
      });

      if (!response.status) {
        throw new Error(response.errorDescr || 'Failed to get tick prices');
      }

      return response;
    } catch (error) {
      console.error('[XTB] Error fetching tick prices:', error);
      throw error;
    }
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

    this.isConnected = false;
    this.streamSessionId = null;
    this.streamListeners.clear();
  }
}

// Create singleton instance
export const xtbService = new XTBService();