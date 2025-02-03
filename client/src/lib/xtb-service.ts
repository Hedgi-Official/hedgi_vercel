// Types for XTB API
interface XTBCredentials {
  userId: string;
  password: string;
}

interface XTBResponse {
  status: boolean;
  returnData?: any;
  streamSessionId?: string;
  errorCode?: string;
  errorDescr?: string;
}

interface TickPrice {
  ask: number;
  bid: number;
  high: number;
  low: number;
  spreadRaw: number;
  spreadTable: number;
  symbol: string;
  timestamp: number;
}

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
      // Exactly match the required format from documentation
      const message = JSON.stringify({
        command: cmd,
        arguments: args
      });

      console.log('Sending command:', cmd, 'with args:', args);
      this.ws!.send(message);

      const handleMessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data) as XTBResponse;
          console.log('Received response:', response);
          this.ws!.removeEventListener('message', handleMessage);

          if (!response.status) {
            reject(new Error(response.errorDescr || 'Unknown error'));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      };

      this.ws!.addEventListener('message', handleMessage);
    });
  }

  async connect(credentials: XTBCredentials): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.addEventListener('open', async () => {
        try {
          console.log('WebSocket connected, attempting login...');
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password
          });

          console.log('Login response:', response);

          if (response.streamSessionId) {
            this.streamSessionId = response.streamSessionId;
            this.isConnected = true;
            await this.setupStreamingConnection();
            resolve();
          } else {
            reject(new Error('No streamSessionId received'));
          }
        } catch (error) {
          reject(error);
        }
      });

      this.ws.addEventListener('error', (error) => {
        console.error('XTB WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      });

      this.ws.addEventListener('close', () => {
        this.isConnected = false;
        this.streamSessionId = null;
      });
    });
  }

  private async setupStreamingConnection(): Promise<void> {
    if (!this.streamSessionId) return;

    return new Promise((resolve, reject) => {
      this.streamWs = new WebSocket(this.streamUrl);

      this.streamWs.addEventListener('open', () => {
        console.log('Streaming connection established');
        resolve();
      });

      this.streamWs.addEventListener('error', (error) => {
        console.error('XTB Streaming WebSocket error:', error);
        reject(new Error('Streaming WebSocket connection failed'));
      });
    });
  }

  async getTickPrices(symbol: string): Promise<any> {
    try {
      console.log('Fetching tick prices for:', symbol);
      const response = await this.sendCommand('getTickPrices', {
        symbol,
        level: 0,
        timestamp: 0
      });
      console.log('Tick prices response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching tick prices:', error);
      throw error;
    }
  }

  disconnect(): void {
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