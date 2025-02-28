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
  streamSessionId?: string;
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
  private streamSessionId: string | null = null;

  private async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      console.log('[Trading Service] Initiating connection to XTB demo server');
      this.ws = new WebSocket('wss://ws.xtb.com/demo');

      this.ws.on('open', () => {
        console.log('[Trading Service] Connected to XTB WebSocket');
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('[Trading Service] WebSocket error:', error);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Trading Service] WebSocket connection closed');
        this.streamSessionId = null;
      });
    });
  }

  private async login(): Promise<void> {
    if (!this.ws) throw new Error('WebSocket not connected');

    const loginCommand = {
      command: "login",
      arguments: {
        userId: process.env.XTB_USER_ID,
        password: process.env.XTB_PASSWORD,
        appName: "Hedgi"
      }
    };

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(loginCommand), (error) => {
        if (error) {
          console.error('[Trading Service] Login error:', error);
          reject(error);
        }
      });

      this.ws!.once('message', (data) => {
        const response = JSON.parse(data.toString());
        if (response.status) {
          this.streamSessionId = response.streamSessionId;
          console.log('[Trading Service] Successfully logged in to XTB');
          resolve();
        } else {
          reject(new Error('Login failed'));
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
      const message = {
        command: cmd,
        arguments: params
      };

      this.ws!.send(JSON.stringify(message), (error) => {
        if (error) reject(error);
      });

      this.ws!.once('message', (data) => {
        const response = JSON.parse(data.toString());
        if (!response.status && response.errorCode) {
          reject(new Error(`${response.errorDescr} (${response.errorCode})`));
        } else {
          resolve(response);
        }
      });
    });
  }

  // API Methods
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);
    const response = await this.sendCommand('tradeTransactionStatus', { order: tradeNumber });
    console.log(`[Trading Service] Trade status for order ${tradeNumber}:`, response);
    return response;
  }

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
    console.log(`[Trading Service] Opening trade for ${symbol}`, {
      price, volume, isBuy, customComment
    });

    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 0 : 1,
      customComment,
      expiration,
      order: 0,
      price,
      sl,
      tp,
      symbol,
      type: 0,
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
    console.log(`[Trading Service] Closing trade for ${symbol}`, {
      positionToClose, price, volume, isBuy, customComment
    });

    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 1 : 0,
      customComment,
      expiration,
      order: positionToClose,
      price,
      sl,
      tp,
      symbol,
      type: 2,
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

// Export a singleton instance
export const tradingService = new TradingService();