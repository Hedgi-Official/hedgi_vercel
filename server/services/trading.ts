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

const REQUEST_STATUS = {
  ERROR: 0,
  PENDING: 1,
  ACCEPTED: 3,
  REJECTED: 4,
} as const;

const getStatusDescription = (status: number): string => {
  switch (status) {
    case REQUEST_STATUS.ERROR:
      return 'Error';
    case REQUEST_STATUS.PENDING:
      return 'Pending';
    case REQUEST_STATUS.ACCEPTED:
      return 'Accepted';
    case REQUEST_STATUS.REJECTED:
      return 'Rejected';
    default:
      return 'Unknown';
  }
};

export class TradingService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private readonly bridgeUrl = 'ws://localhost:8765';

  private async ensureConnection(): Promise<void> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.bridgeUrl);

      const timeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        console.log('[Trading Service] Connected to XTB Bridge');
        resolve();
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        console.error('[Trading Service] WebSocket error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Trading Service] WebSocket connection closed');
        this.isConnected = false;
      });
    });
  }

  private async sendCommand(command: string, params: any): Promise<XTBResponse> {
    await this.ensureConnection();

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command ${command} timeout`));
      }, 10000);

      const handleMessage = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString()) as XTBResponse;
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
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await this.sendCommand('checkTradeStatus', {
        orderNumber: tradeNumber
      });

      return {
        command: 'tradeTransactionStatus',
        status: response.status,
        returnData: {
          order: tradeNumber,
          status: response.returnData?.status || 'Unknown',
          customComment: response.returnData?.customComment || '',
          message: response.returnData?.message || null,
          requestStatus: response.returnData?.requestStatus || 0,
          price: response.returnData?.price || 0,
          errorCode: response.returnData?.errorCode,
          errorDescr: response.returnData?.errorDescr,
        }
      };
    } catch (error) {
      console.error(`[Trading Service] Error checking trade status:`, error);
      throw error;
    }
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
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes in milliseconds

  private async login(): Promise<void> {
    // If already logged in and the session is still valid, just return
    const currentTime = Date.now();
    if (this.isLoggedIn && 
        (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Already logged in with valid session');
      return;
    }

    // Reset login state
    this.isLoggedIn = false;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.ensureConnection();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Login timeout'));
      }, this.connectionTimeout);

      const loginCommand = {
        command: "login",
        arguments: {
          userId: '17474971',
          password: 'xoh74681',
          appName: "Hedgi"
        }
      };

      console.log('[Trading Service] Sending login command with user ID 17474971');

      this.ws.send(JSON.stringify(loginCommand), (error) => {
        if (error) {
          clearTimeout(timeoutId);
          console.error('[Trading Service] Login send error:', error);
          reject(error);
        }
      });

      this.ws.once('message', (data) => {
        clearTimeout(timeoutId);
        const response = JSON.parse(data.toString());
        console.log('[Trading Service] Login response:', {
          status: response.status,
          hasStreamSessionId: !!response.streamSessionId
        });

        if (response.status) {
          this.isLoggedIn = true;
          this.lastLoginTime = Date.now();
          console.log('[Trading Service] Successfully logged in');
          resolve();
        } else {
          this.isLoggedIn = false;
          const error = response.errorCode ?
            `Login failed: ${response.errorDescr} (${response.errorCode})` :
            'Login failed';
          console.error('[Trading Service] Login failed:', error);
          reject(new Error(error));
        }
      });
    });
  }


  // Helper method to check login status and reconnect if needed
  private async ensureLoggedIn(): Promise<void> {
    // If we have a connection but aren't logged in, try to login
    if (this.ws?.readyState === WebSocket.OPEN && !this.isLoggedIn) {
      await this.login();
      return;
    }

    // If we don't have a connection or it's not open, establish connection and login
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.ensureConnection();
      await this.login();
      return;
    }

    // Otherwise, just ensure our login session is still valid
    const currentTime = Date.now();
    if (currentTime - this.lastLoginTime >= this.sessionTimeout) {
      console.log('[Trading Service] Session timed out, logging in again');
      await this.login();
    }
  }
  private readonly connectionTimeout = 10000; // 10 seconds

}

export const tradingService = new TradingService();