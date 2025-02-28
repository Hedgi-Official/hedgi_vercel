import { z } from "zod";
import WebSocket from "ws";

// Constants from Python implementation remain unchanged
const TRANSACTION_TYPE = {
  ORDER_OPEN: 0,
  ORDER_CLOSE: 2,
  ORDER_MODIFY: 3,
  ORDER_DELETE: 4,
} as const;

const TRANSACTION_SIDE = {
  BUY: 0,
  SELL: 1,
  BUY_LIMIT: 2,
  SELL_LIMIT: 3,
  BUY_STOP: 4,
  SELL_STOP: 5,
} as const;

// Interfaces remain unchanged
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
  errorCode?: string;
  errorDescr?: string;
}

interface TradeTransInfo {
  cmd: number;      // TRANSACTION_SIDE values
  customComment: string;
  expiration: number;
  order: number;
  price: number;
  sl: number;      // Stop loss
  tp: number;      // Take profit
  symbol: string;
  type: number;    // TRANSACTION_TYPE values
  volume: number;
}

// Schema validation remains unchanged
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
  private streamWs: WebSocket | null = null;
  private streamSessionId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private readonly connectionTimeout = 5000; // Reduced to 5 seconds
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes
  private isInitialized = false;
  private initializeStartTime = 0;

  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.initializeStartTime = Date.now();
    console.log('[Trading Service] Starting initialization');

    try {
      await this.ensureConnection();
      await this.login();
      this.isInitialized = true;

      const initDuration = Date.now() - this.initializeStartTime;
      console.log(`[Trading Service] Service initialized successfully in ${initDuration}ms`);
    } catch (error) {
      const failureDuration = Date.now() - this.initializeStartTime;
      console.error(`[Trading Service] Initialization failed after ${failureDuration}ms:`, error);
      this.isInitialized = false;
      throw error;
    }
  }

  private async ensureConnection(): Promise<void> {
    const startTime = Date.now();
    console.log('[Trading Service] Checking connection status');

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Trading Service] Using existing connection');
      return;
    }

    if (this.connectionPromise) {
      console.log('[Trading Service] Connection attempt already in progress');
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const duration = Date.now() - startTime;
        console.log(`[Trading Service] Connection attempt timed out after ${duration}ms`);
        if (this.ws) {
          this.ws.close();
        }
        this.ws = null;
        this.connectionPromise = null;
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      try {
        console.log('[Trading Service] Initiating new connection to XTB demo server');
        this.ws = new WebSocket('wss://ws.xtb.com/demo');

        this.ws.on('open', () => {
          const duration = Date.now() - startTime;
          console.log(`[Trading Service] Connected to XTB WebSocket in ${duration}ms`);
          clearTimeout(timeoutId);
          resolve();
        });

        this.ws.on('error', (error) => {
          const duration = Date.now() - startTime;
          console.error(`[Trading Service] WebSocket error after ${duration}ms:`, error);
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
          this.isInitialized = false;
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Trading Service] Error creating WebSocket after ${duration}ms:`, error);
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private async login(): Promise<void> {
    const startTime = Date.now();
    console.log('[Trading Service] Checking login status');

    const currentTime = Date.now();
    if (this.isLoggedIn && this.streamSessionId &&
        (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Using existing login session');
      return;
    }

    this.isLoggedIn = false;
    this.streamSessionId = null;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.ensureConnection();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const duration = Date.now() - startTime;
        console.log(`[Trading Service] Login attempt timed out after ${duration}ms`);
        reject(new Error('Login timeout'));
      }, this.connectionTimeout);

      try {
        const loginCommand = {
          command: "login",
          arguments: {
            userId: process.env.XTB_USER_ID || '17474971',
            password: process.env.XTB_PASSWORD || 'xoh74681',
            appName: "Hedgi"
          }
        };

        console.log('[Trading Service] Sending login command');

        if (!this.ws) {
          clearTimeout(timeoutId);
          reject(new Error('WebSocket not connected'));
          return;
        }

        this.ws.send(JSON.stringify(loginCommand), (error) => {
          if (error) {
            clearTimeout(timeoutId);
            console.error('[Trading Service] Login send error:', error);
            reject(error);
          }
        });

        this.ws.once('message', (data) => {
          clearTimeout(timeoutId);
          try {
            const response = JSON.parse(data.toString());
            const duration = Date.now() - startTime;
            console.log(`[Trading Service] Login response received in ${duration}ms:`, {
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
              const error = new Error(response.errorCode ?
                `Login failed: ${response.errorDescr} (${response.errorCode})` :
                'Login failed');
              console.error('[Trading Service] Login failed:', error);
              reject(error);
            }
          } catch (error) {
            console.error('[Trading Service] Error parsing login response:', error);
            reject(new Error('Failed to parse login response'));
          }
        });
      } catch (error) {
        console.error('[Trading Service] Error during login:', error);
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  private async ensureLoggedIn(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN && !this.isLoggedIn) {
      await this.login();
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.ensureConnection();
      await this.login();
      return;
    }

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
        console.log(`[Trading Service] Command ${cmd} timed out`);
        if (this.ws) {
          this.ws.removeEventListener('message', handleMessage);
        }
        reject(new Error(`Command ${cmd} timeout`));
      }, this.connectionTimeout);

      const handleMessage = (data: WebSocket.MessageEvent) => {
        try {
          let response: XTBResponse;

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
            errorCode: response.errorCode,
            errorDescr: response.errorDescr
          });

          if (!response.status && response.errorCode) {
            reject(new Error(`${response.errorDescr} (${response.errorCode})`));
          } else {
            resolve(response);
          }
        } catch (error) {
          console.error('[Trading Service] Error parsing response:', error);
          console.error('[Trading Service] Raw response data:', data.data);
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

      console.log(`[Trading Service] Sending ${cmd} command:`, {
        command: cmd,
        ...params,
        password: undefined
      });

      this.ws.addEventListener('message', handleMessage);
      this.ws.send(message, (error) => {
        if (error) {
          clearTimeout(timeoutId);
          if (this.ws) {
            this.ws.removeEventListener('message', handleMessage);
          }
          console.error(`[Trading Service] Error sending ${cmd} command:`, error);
          reject(error);
        }
      });
    });
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);
      await this.ensureLoggedIn();

      const response = await this.sendCommandWithoutLogin('tradeTransactionStatus', { order: tradeNumber });

      if (!response.returnData?.requestStatus) {
        throw new Error('Invalid response format from XTB');
      }

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
    const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

    console.log(`[Trading Service] Opening trade for ${symbol}`, {
      price, originalVolume: volume, adjustedVolume, isBuy, customComment
    });

    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? TRANSACTION_SIDE.BUY : TRANSACTION_SIDE.SELL,
      customComment,
      expiration,
      order: 0,  // For new orders, always set to 0
      price,
      sl,
      tp,
      symbol,
      type: TRANSACTION_TYPE.ORDER_OPEN,
      volume: adjustedVolume,
    });

    await this.ensureLoggedIn();

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
    const adjustedVolume = ['USDBRL', 'USDMXN'].includes(symbol) ? volume / 100000 : volume;

    console.log(`[Trading Service] Closing trade for ${symbol}`, {
      positionToClose, price, originalVolume: volume, adjustedVolume, isBuy, customComment
    });

    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? TRANSACTION_SIDE.SELL : TRANSACTION_SIDE.BUY,  // Opposite of opening trade
      customComment,
      expiration,
      order: positionToClose,
      price,
      sl,
      tp,
      symbol,
      type: TRANSACTION_TYPE.ORDER_CLOSE,
      volume: adjustedVolume,
    });

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