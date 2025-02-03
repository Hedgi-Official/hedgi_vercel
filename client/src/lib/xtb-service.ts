export class XTBService {
  private ws: WebSocket | null = null;
  private streamWs: WebSocket | null = null;
  private isConnected = false;
  private streamSessionId: string | null = null;

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
      console.log('[XTB] Connecting to main socket...');
      this.ws = new WebSocket(this.serverUrl);

      this.ws.addEventListener('open', async () => {
        try {
          console.log('[XTB] Main socket connected, attempting login...');
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password,
            appName: "Hedgi"
          });

          console.log('[XTB] Login response:', response);

          if (response.streamSessionId) {
            this.streamSessionId = response.streamSessionId;
            this.isConnected = true;
            await this.setupStreamingConnection();
            resolve();
          } else {
            reject(new Error('No streamSessionId received'));
          }
        } catch (error) {
          console.error('[XTB] Login error:', error);
          reject(error);
        }
      });

      this.ws.addEventListener('error', (error) => {
        console.error('[XTB] Main socket error:', error);
        reject(new Error('WebSocket connection failed'));
      });

      this.ws.addEventListener('close', () => {
        console.log('[XTB] Main socket closed');
        this.isConnected = false;
        this.streamSessionId = null;
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

      this.streamWs.addEventListener('open', () => {
        console.log('[XTB] Streaming connection established');
        resolve();
      });

      this.streamWs.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[XTB] Streaming data received:', data);
        } catch (error) {
          console.error('[XTB] Error parsing streaming data:', error);
        }
      });

      this.streamWs.addEventListener('error', (error) => {
        console.error('[XTB] Streaming socket error:', error);
        reject(new Error('Streaming WebSocket connection failed'));
      });

      this.streamWs.addEventListener('close', () => {
        console.log('[XTB] Streaming connection closed');
      });
    });
  }

  async getAllSymbols(): Promise<any> {
    try {
      console.log('[XTB] Fetching all symbols...');
      const response = await this.sendCommand('getAllSymbols');
      console.log('[XTB] All symbols response:', response);
      return response;
    } catch (error) {
      console.error('[XTB] Error fetching symbols:', error);
      throw error;
    }
  }

  async getTickPrices(symbol: string): Promise<any> {
    if (!this.streamSessionId) {
      throw new Error('Not connected to streaming server');
    }

    try {
      console.log('[XTB] Fetching tick prices for:', symbol);

      // Subscribe to candle updates
      const streamMessage = JSON.stringify({
        command: "getCandles",
        streamSessionId: this.streamSessionId,
        symbol: symbol
      });

      if (this.streamWs) {
        console.log('[XTB] Subscribing to candles for:', symbol);
        this.streamWs.send(streamMessage);
      }

      // Get initial price data
      const response = await this.sendCommand('getTickPrices', {
        symbol,
        level: 0,
        timestamp: 0
      });

      console.log('[XTB] Tick prices response for', symbol, ':', response);
      return response;
    } catch (error) {
      console.error('[XTB] Error fetching tick prices for', symbol, ':', error);
      throw error;
    }
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
  }
}

// Create singleton instance
export const xtbService = new XTBService();