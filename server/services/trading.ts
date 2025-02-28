import { z } from "zod";
import WebSocket from "ws";

// Define interfaces for API interactions
interface XTBResponse {
  command: string;
  status: boolean;
  returnData: {
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

// Map for trade status codes
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
  private streamWs: WebSocket | null = null;
  private streamSessionId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private readonly connectionTimeout = 10000; // 10 seconds

  private async ensureConnection(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.ws?.close();
        this.ws = null;
        this.connectionPromise = null;
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      console.log('[Trading Service] Initiating connection to XTB demo server');
      this.ws = new WebSocket('wss://ws.xtb.com/demo');

      this.ws.on('open', () => {
        console.log('[Trading Service] Connected to XTB WebSocket');
        clearTimeout(timeoutId);
        resolve();
      });

      this.ws.on('error', (error) => {
        console.error('[Trading Service] WebSocket error:', error);
        clearTimeout(timeoutId);
        this.ws = null;
        this.connectionPromise = null;
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('[Trading Service] WebSocket connection closed');
        this.ws = null;
        this.streamSessionId = null;
        this.connectionPromise = null;
        this.isLoggedIn = false;
      });
    });

    return this.connectionPromise;
  }

  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes in milliseconds

  private async login(): Promise<void> {
    // If already logged in and the session is still valid, just return
    const currentTime = Date.now();
    if (this.isLoggedIn && this.streamSessionId &&
        (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Already logged in with valid session');
      return;
    }

    // Reset login state
    this.isLoggedIn = false;
    this.streamSessionId = null;

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
          this.streamSessionId = response.streamSessionId;
          this.isLoggedIn = true;
          this.lastLoginTime = Date.now();
          console.log('[Trading Service] Successfully logged in with session ID:', this.streamSessionId);
          resolve();
        } else {
          this.isLoggedIn = false;
          this.streamSessionId = null;
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

  private async sendCommand(cmd: string, params: any): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();

      return this.sendCommandWithoutLogin(cmd, params);
    } catch (error) {
      console.error(`[Trading Service] Error in sendCommand(${cmd}):`, error);
      throw error;
    }
  }

  private async sendCommandWithoutLogin(cmd: string, params: any): Promise<XTBResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
        if (this.ws) {
          this.ws.removeEventListener('message', handleMessage);
        }
        reject(new Error(`Command ${cmd} timeout`));
      }, this.connectionTimeout);

      const handleMessage = (data: WebSocket.MessageEvent) => {
        try {
          let response: XTBResponse;

          // Handle both string and Buffer data types
          if (Buffer.isBuffer(data.data)) {
            response = JSON.parse(data.data.toString());
          } else if (typeof data.data === 'string') {
            response = JSON.parse(data.data);
          } else {
            throw new Error('Unexpected WebSocket message format');
          }

          console.log(`[Trading Service] Received response for ${cmd}:`, {
            status: response.status,
            hasReturnData: !!response.returnData,
            rawData: response
          });

          if (!response.status && response.errorCode) {
            reject(new Error(`${response.errorDescr} (${response.errorCode})`));
          } else {
            resolve(response);
          }
        } catch (e) {
          console.error('[Trading Service] Error parsing response:', e, data.data);
          reject(new Error('Failed to parse XTB response'));
        } finally {
          clearTimeout(timeoutId);
          if (this.ws) {
            this.ws.removeEventListener('message', handleMessage);
          }
        }
      };

      const message = JSON.stringify({
        command: cmd,
        arguments: params
      });

      console.log(`[Trading Service] Sending command ${cmd}:`, {
        command: cmd,
        ...params,
        password: undefined // Never log passwords
      });

      if (this.ws) {
        this.ws.addEventListener('message', handleMessage);
        this.ws.send(message, (error) => {
          if (error) {
            clearTimeout(timeoutId);
            if (this.ws) {
              this.ws.removeEventListener('message', handleMessage);
            }
            reject(error);
          }
        });
      }
    });
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      // Ensure we're logged in
      await this.ensureLoggedIn();

      const response = await this.sendCommandWithoutLogin('tradeTransactionStatus', { order: tradeNumber });

      if (!response.returnData?.requestStatus) {
        throw new Error('Invalid response format from XTB');
      }

      // Format the response to match STREAMING_TRADE_STATUS_RECORD
      const formattedResponse: XTBResponse = {
        command: 'tradeTransactionStatus',
        status: response.status,
        returnData: {
          order: tradeNumber,
          status: getStatusDescription(response.returnData.requestStatus),
          customComment: response.returnData.customComment || '',
          message: response.returnData.message || null,
          requestStatus: response.returnData.requestStatus,
          price: response.returnData.price || 0,
          errorCode: response.returnData.errorCode,
          errorDescr: response.returnData.errorDescr,
        }
      };

      console.log(`[Trading Service] Trade status for order ${tradeNumber}:`, formattedResponse);
      return formattedResponse;
    } catch (error) {
      console.error(`[Trading Service] Error checking trade status for order ${tradeNumber}:`, error);
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
    // Adjust volume: For USDBRL and USDMXN, the volume is the USD amount divided by 100,000
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

    // Ensure we have a valid login session
    await this.ensureLoggedIn();

    // Send the trade command
    const tradeResponse = await this.sendCommandWithoutLogin('tradeTransaction', { tradeTransInfo });
    if (!tradeResponse.status) {
      throw new Error(`Failed to open trade: ${tradeResponse.returnData.errorDescr || 'Unknown error'}`);
    }

    const tradeNumber = tradeResponse.returnData.order;
    console.log(`[Trading Service] Trade opened. Order number: ${tradeNumber}`);

    const statusResponse = await this.checkTradeStatus(tradeNumber);
    if (statusResponse.returnData.errorCode) {
      throw new Error(`Trade status error: ${statusResponse.returnData.errorDescr}`);
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
    // Adjust volume: For USDBRL and USDMXN, the volume is the USD amount divided by 100,000
    const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

    console.log(`[Trading Service] Closing trade for ${symbol}`, {
      positionToClose, price, originalVolume: volume, adjustedVolume, isBuy, customComment
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
      volume: adjustedVolume,
    });

    // Ensure we have a valid login session
    await this.ensureLoggedIn();

    const closeResponse = await this.sendCommandWithoutLogin('tradeTransaction', { tradeTransInfo });
    if (!closeResponse.status) {
      throw new Error(`Failed to close trade: ${closeResponse.returnData.errorDescr || 'Unknown error'}`);
    }

    const closingOrderNumber = closeResponse.returnData.order;
    console.log(`[Trading Service] Trade closed. Closing order number: ${closingOrderNumber}`);

    const statusResponse = await this.checkTradeStatus(closingOrderNumber);
    if (statusResponse.returnData.errorCode) {
      throw new Error(`Close trade status error: ${statusResponse.returnData.errorDescr}`);
    }

    return closingOrderNumber;
  }
}

// Export a singleton instance
export const tradingService = new TradingService();