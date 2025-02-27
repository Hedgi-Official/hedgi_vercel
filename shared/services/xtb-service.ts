import WebSocket from 'ws';

export interface XTBCredentials {
  userId: string;
  password: string;
}

export interface XTBSymbolData {
  symbol: string;
  bid: number;
  ask: number;
  time: number;
  swapLong: number;
  swapShort: number;
}

export interface XTBResponse {
  status: boolean;
  returnData?: any;
  errorCode?: string;
  errorDescr?: string;
}

export class XTBService {
  private ws: WebSocket | null = null;
  private streamSessionId: string | null = null;
  private isConnected: boolean = false;

  protected createWebSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public async connect(credentials: XTBCredentials): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = this.createWebSocket('wss://ws.xtb.com/real');

        this.ws.on('open', () => {
          this.login(credentials)
            .then((success) => {
              this.isConnected = success;
              resolve(success);
            })
            .catch(reject);
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.streamSessionId = null;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async login(credentials: XTBCredentials): Promise<boolean> {
    const loginCommand = {
      command: 'login',
      arguments: {
        userId: credentials.userId,
        password: credentials.password,
      },
    };

    return this.sendCommand(loginCommand);
  }

  public async getSymbolData(symbol: string): Promise<XTBResponse> {
    const command = {
      command: 'getSymbol',
      arguments: {
        symbol: symbol,
      },
    };

    return this.sendCommand(command);
  }

  private sendCommand(command: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      const messageHandler = (message: WebSocket.Data) => {
        try {
          const response = JSON.parse(message.toString());
          this.ws?.removeListener('message', messageHandler);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      };

      this.ws.on('message', messageHandler);
      this.ws.send(JSON.stringify(command));
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      this.streamSessionId = null;
    }
  }
}