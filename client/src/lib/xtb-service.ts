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

      this.ws!.send(message);

      const handleMessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data) as XTBResponse;
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
          // Match exactly the format from documentation
          const response = await this.sendCommand('login', {
            userId: credentials.userId,
            password: credentials.password
          });

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
        resolve();
      });

      this.streamWs.addEventListener('error', (error) => {
        console.error('XTB Streaming WebSocket error:', error);
        reject(new Error('Streaming WebSocket connection failed'));
      });
    });
  }

  async getTickPrices(symbol: string): Promise<any> {
    return this.sendCommand('getTickPrices', {
      symbol,
      minArrivalTime: 0,
      maxLevel: 2
    });
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