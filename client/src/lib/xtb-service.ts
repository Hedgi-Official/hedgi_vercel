import WebSocket from 'ws';

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

export class XTBService {
  private ws: WebSocket | null = null;
  private streamWs: WebSocket | null = null;
  private isConnected = false;
  private streamSessionId: string | null = null;

  constructor(private readonly serverUrl = 'wss://ws.xtb.com/real') {}

  private async sendCommand(cmd: string, params: any = {}): Promise<XTBResponse> {
    if (!this.ws) {
      throw new Error('Not connected to XTB');
    }

    return new Promise((resolve, reject) => {
      const message = JSON.stringify({
        command: cmd,
        arguments: params,
      });

      this.ws!.send(message, (error) => {
        if (error) reject(error);
      });

      this.ws!.once('message', (data) => {
        try {
          const response = JSON.parse(data.toString()) as XTBResponse;
          if (!response.status) {
            reject(new Error(response.errorDescr || 'Unknown error'));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async connect(credentials: XTBCredentials): Promise<void> {
    if (this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', async () => {
        try {
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password,
            appName: 'Hedgi',
          });

          if (response.streamSessionId) {
            this.streamSessionId = response.streamSessionId;
            this.isConnected = true;
            this.setupStreamingConnection();
            resolve();
          } else {
            reject(new Error('No streamSessionId received'));
          }
        } catch (error) {
          reject(error);
        }
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.isConnected = false;
        this.streamSessionId = null;
      });
    });
  }

  private setupStreamingConnection(): void {
    if (!this.streamSessionId) return;

    this.streamWs = new WebSocket(`${this.serverUrl}/stream`);

    this.streamWs.on('open', () => {
      if (this.streamWs) {
        this.streamWs.send(JSON.stringify({
          command: 'getTickPrices',
          streamSessionId: this.streamSessionId,
          symbol: 'EURUSD',
        }));
      }
    });
  }

  async getSymbols(): Promise<any> {
    return this.sendCommand('getAllSymbols');
  }

  async getTickPrices(symbol: string): Promise<any> {
    return this.sendCommand('getTickPrices', { symbol });
  }

  disconnect(): void {
    if (this.streamWs) {
      this.streamWs.close();
      this.streamWs = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
    this.streamSessionId = null;
  }
}

// Create singleton instance
export const xtbService = new XTBService();