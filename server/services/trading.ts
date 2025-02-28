import { z } from "zod";
import WebSocket from "ws";

// Define interfaces for API interactions
interface XTBResponse {
  command: string;
  status: boolean;
  returnData: {
    order: number;
    status: string;
    errorCode?: string;
    errorDescr?: string;
  };
}

interface TradeTransInfo {
  cmd: number;      // 0 for BUY, 1 for SELL
  customComment: string;
  expiration: number;
  order: number;
  price: number;
  sl: number;      // Stop loss
  tp: number;      // Take profit
  symbol: string;
  type: number;    // 0 for open, 2 for close
  volume: number;
}

// Schema for trade transaction info validation
const tradeTransInfoSchema = z.object({
  cmd: z.number(),
  customComment: z.string(),
  expiration: z.number(),
  order: z.number(),
  price: z.number(),
  sl: z.number(),
  tp: z.number(),
  symbol: z.string(),
  type: z.number(),
  volume: z.number(),
});

export class TradingService {
  private ws: WebSocket | null = null;
  private streamWs: WebSocket | null = null;
  private streamSessionId: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  private async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Maximum reconnection attempts reached');
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('wss://ws.xtb.com/demo');

      this.ws.on('open', () => {
        console.log('[Trading Service] Connected to XTB WebSocket');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('[Trading Service] WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Trading Service] WebSocket connection closed');
        this.streamSessionId = null;
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 2000); // Reconnect after 2 seconds
      });
    });
  }

  private async connectStream(): Promise<void> {
    if (this.streamWs && this.streamWs.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.streamSessionId) {
        reject(new Error('No stream session ID available'));
        return;
      }

      this.streamWs = new WebSocket('wss://ws.xtb.com/demoStream');

      this.streamWs.on('open', () => {
        console.log('[Trading Service] Connected to XTB Streaming WebSocket');
        resolve();
      });

      this.streamWs.on('error', (error) => {
        console.error('[Trading Service] Streaming WebSocket error:', error);
        reject(error);
      });

      this.streamWs.on('close', () => {
        console.log('[Trading Service] Streaming WebSocket connection closed');
        setTimeout(() => this.connectStream(), 2000);
      });
    });
  }

  private async login(): Promise<void> {
    if (!this.ws) throw new Error('WebSocket not connected');

    const loginCommand = {
      command: "login",
      arguments: {
        userId: process.env.VITE_XTB_USER_ID || '17474971',
        password: process.env.VITE_XTB_PASSWORD || 'xoh74681',
        appName: "Hedgi"
      },
      streamSessionId: this.streamSessionId
    };

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      console.log('[Trading Service] Attempting login with command:', {
        ...loginCommand,
        arguments: {
          ...loginCommand.arguments,
          password: '***'
        }
      });

      this.ws.send(JSON.stringify(loginCommand), (error) => {
        if (error) {
          console.error('[Trading Service] Login error:', error);
          reject(error);
        }
      });

      this.ws.once('message', (data) => {
        const response = JSON.parse(data.toString());
        console.log('[Trading Service] Login response:', response);

        if (response.status) {
          this.streamSessionId = response.streamSessionId;
          console.log('[Trading Service] Successfully logged in to XTB, streamSessionId:', this.streamSessionId);
          // After successful login, connect to the streaming socket
          this.connectStream()
            .then(() => resolve())
            .catch((error) => {
              console.error('[Trading Service] Failed to connect to streaming socket:', error);
              resolve(); // Still resolve as main connection is established
            });
        } else {
          const error = response.errorCode ? 
            `Login failed: ${response.errorDescr} (${response.errorCode})` : 
            'Login failed';
          reject(new Error(error));
        }
      });
    });
  }

  private async sendCommand(cmd: string, params: any): Promise<XTBResponse> {
    await this.connect();
    if (!this.streamSessionId) {
      await this.login();
    }

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const message = {
        command: cmd,
        arguments: params
      };

      console.log(`[Trading Service] Sending command: ${cmd}`, params);

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
      });

      this.ws.once('message', (data) => {
        const response = JSON.parse(data.toString());
        console.log(`[Trading Service] Received response for ${cmd}:`, response);

        if (!response.status && response.errorCode) {
          reject(new Error(`${response.errorDescr} (${response.errorCode})`));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Get current market data for a symbol
  async getSymbolData(symbol: string): Promise<XTBResponse> {
    return this.sendCommand('getSymbol', { symbol });
  }

  // Open a new trade position
  async openTrade(
    symbol: string,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    customComment: string = "",
    expiration: number = 0
  ): Promise<number> {
    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 0 : 1,
      customComment,
      expiration,
      order: 0,
      price,
      sl,
      tp,
      symbol,
      type: 0, // Open position
      volume,
    });

    const response = await this.sendCommand('tradeTransaction', { tradeTransInfo });
    if (!response.status) {
      throw new Error(`Failed to open trade: ${response.returnData.errorDescr || 'Unknown error'}`);
    }

    const tradeNumber = response.returnData.order;
    console.log(`[Trading Service] Trade opened. Order number: ${tradeNumber}`);
    return tradeNumber;
  }

  // Check the status of a trade
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    const response = await this.sendCommand('tradeTransactionStatus', { order: tradeNumber });
    console.log(`[Trading Service] Trade status for order ${tradeNumber}:`, response);
    return response;
  }

  // Close an existing trade position
  async closeTrade(
    symbol: string,
    positionToClose: number,
    price: number,
    volume: number,
    isBuy: boolean,
    sl: number = 0,
    tp: number = 0,
    customComment: string = "",
    expiration: number = 0
  ): Promise<number> {
    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 1 : 0, // Opposite of opening command
      customComment,
      expiration,
      order: positionToClose,
      price,
      sl,
      tp,
      symbol,
      type: 2, // Close position
      volume,
    });

    const response = await this.sendCommand('tradeTransaction', { tradeTransInfo });
    if (!response.status) {
      throw new Error(`Failed to close trade: ${response.returnData.errorDescr || 'Unknown error'}`);
    }

    const closingOrderNumber = response.returnData.order;
    console.log(`[Trading Service] Trade closed. Closing order number: ${closingOrderNumber}`);
    return closingOrderNumber;
  }
}

export const tradingService = new TradingService();