import { z } from "zod";
import WebSocket from "ws";

interface XTBResponse {
  status: boolean;
  returnData?: {
    order: number;
    status: string;
    customComment?: string;
    message?: string | null;
    requestStatus?: number;
    price?: number;
    errorCode?: string;
    errorDescr?: string;
  };
  streamSessionId?: string;
  error?: string;
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
  private isConnected = false;
  private readonly bridgeUrl = 'ws://localhost:8765';
  private readonly connectionTimeout = 10000; // 10 seconds
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 3;

  private async ensureConnection(): Promise<void> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Trading Service] WebSocket already connected');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new Error('Max reconnection attempts reached');
    }

    console.log('[Trading Service] Attempting to connect to WebSocket bridge');

    return new Promise((resolve, reject) => {
      // Clean up any existing connection
      if (this.ws) {
        try {
          this.ws.close();
        } catch (e) {
          console.error('[Trading Service] Error closing existing connection:', e);
        }
      }

      this.ws = new WebSocket(this.bridgeUrl, {
        headers: {
          "Connection": "Upgrade",
          "Upgrade": "websocket",
        },
        handshakeTimeout: this.connectionTimeout,
      });

      const timeout = setTimeout(() => {
        console.error('[Trading Service] Connection timeout');
        this.ws?.close();
        this.reconnectAttempts++;
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      this.ws.on('open', () => {
        console.log('[Trading Service] WebSocket connection established');
        clearTimeout(timeout);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('[Trading Service] WebSocket error:', error);
        clearTimeout(timeout);
        this.isConnected = false;
        this.reconnectAttempts++;
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Trading Service] WebSocket connection closed');
        this.isConnected = false;
      });
    });
  }

  private async sendCommand(command: string, params: any): Promise<XTBResponse> {
    try {
      await this.ensureConnection();

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket not connected');
      }

      console.log(`[Trading Service] Sending command ${command}:`, params);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.ws?.removeListener('message', handleMessage);
          reject(new Error(`Command ${command} timeout`));
        }, this.connectionTimeout);

        const handleMessage = (data: WebSocket.Data) => {
          try {
            const response = JSON.parse(data.toString()) as XTBResponse;
            console.log(`[Trading Service] Received response for ${command}:`, response);

            clearTimeout(timeout);
            this.ws?.removeListener('message', handleMessage);

            if (!response.status) {
              reject(new Error(response.error || 'Unknown error'));
            } else {
              resolve(response);
            }
          } catch (error) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', handleMessage);
            console.error('[Trading Service] Error parsing response:', error);
            reject(new Error('Failed to parse response'));
          }
        };

        this.ws.on('message', handleMessage);

        const message = JSON.stringify({
          command,
          ...params
        });

        this.ws.send(message, (error) => {
          if (error) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', handleMessage);
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error(`[Trading Service] Error in sendCommand(${command}):`, error);
      throw error;
    }
  }

  async connect(credentials: { userId: string; password: string }): Promise<XTBResponse> {
    console.log('[Trading Service] Attempting to connect to XTB');
    return this.sendCommand('connect', { credentials });
  }
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);
    return this.sendCommand('checkTradeStatus', {
      orderNumber: tradeNumber
    });
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
    const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

    console.log(`[Trading Service] Opening trade for ${symbol}`, {
      price, originalVolume: volume, adjustedVolume, isBuy, customComment
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
      volume: adjustedVolume,
    });

    const response = await this.sendCommand('placeTrade', { tradeInfo: tradeTransInfo });

    if (!response.status) {
      throw new Error(response.error || 'Failed to open trade');
    }

    const tradeNumber = response.returnData?.order;
    if (!tradeNumber) {
      throw new Error('No trade number received');
    }

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
    const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

    console.log(`[Trading Service] Closing trade for ${symbol}`, {
      positionToClose, price, originalVolume: volume, adjustedVolume, isBuy, customComment
    });

    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 0 : 1,
      customComment,
      expiration,
      order: positionToClose,
      price,
      sl,
      tp,
      symbol,
      type: 2,
      volume: adjustedVolume,
    });

    const response = await this.sendCommand('closeTrade', { closeInfo: tradeTransInfo });

    if (!response.status) {
      throw new Error(response.error || 'Failed to close trade');
    }

    const closingOrderNumber = response.returnData?.order;
    if (!closingOrderNumber) {
      throw new Error('No closing order number received');
    }

    console.log(`[Trading Service] Trade closed. Closing order number: ${closingOrderNumber}`);
    return closingOrderNumber;
  }
}

export const tradingService = new TradingService();