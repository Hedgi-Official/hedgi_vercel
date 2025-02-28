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
  private streamWs: WebSocket | null = null;
  private streamSessionId: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private readonly connectionTimeout = 10000; // 10 seconds

  private async ensureConnection(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[Trading Service] Using existing WebSocket connection');
      return;
    }

    if (this.connectionPromise) {
      console.log('[Trading Service] Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    // Check credentials before attempting connection
    if (!process.env.XTB_USER_ID || !process.env.XTB_PASSWORD) {
      throw new Error('XTB credentials not found in environment variables');
    }

    console.log('[Trading Service] Creating new connection promise');
    this.connectionPromise = new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.log('[Trading Service] Connection attempt timed out');
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }
        this.connectionPromise = null;
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      try {
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
      });
    });

    return this.connectionPromise;
  }

  private async login(): Promise<void> {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Login timeout'));
      }, this.connectionTimeout);

      // Ensure credentials are properly loaded
      if (!process.env.XTB_USER_ID || !process.env.XTB_PASSWORD) {
        clearTimeout(timeoutId);
        reject(new Error('XTB credentials not found in environment variables'));
        return;
      }

      // Make sure we're using the exact same credential format that works for price fetching
      const loginCommand = {
        command: "login",
        arguments: {
          userId: process.env.XTB_USER_ID,
          password: process.env.XTB_PASSWORD,
          appName: "Hedgi"
        }
      };

      console.log('[Trading Service] Attempting login with:', {
        command: loginCommand.command,
        arguments: {
          userId: `${loginCommand.arguments.userId?.substring(0, 3)}...`,
          password: '***',
          appName: loginCommand.arguments.appName
        }
      });

      try {
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
            console.log('[Trading Service] Login response:', {
              status: response.status,
              errorCode: response.errorCode,
              errorDescr: response.errorDescr,
              hasStreamSessionId: !!response.streamSessionId
            });

            if (response.status) {
              this.streamSessionId = response.streamSessionId;
              resolve();
            } else {
              const error = response.errorCode ? 
                `Login failed: ${response.errorDescr} (${response.errorCode})` : 
                'Login failed';
              reject(new Error(error));
            }
          } catch (parseError) {
            console.error('[Trading Service] Error parsing login response:', parseError, data.toString());
            reject(new Error(`Error parsing login response: ${parseError.message}`));
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('[Trading Service] Error during login:', error);
        reject(error);
      }
    });
  }

  private async sendCommand(cmd: string, params: any): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Ensuring connection for command: ${cmd}`);
      await this.ensureConnection();
      
      console.log(`[Trading Service] Logging in for command: ${cmd}`);
      await this.login();

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not connected'));
          return;
        }

        const timeoutId = setTimeout(() => {
          console.error(`[Trading Service] Command ${cmd} timed out`);
          reject(new Error(`Command ${cmd} timeout`));
        }, this.connectionTimeout);

        const message = {
          command: cmd,
          arguments: params
        };

        console.log(`[Trading Service] Sending command: ${cmd}`, {
          ...params,
          password: undefined // Never log passwords
        });

        try {
          this.ws.send(JSON.stringify(message), (error) => {
            if (error) {
              clearTimeout(timeoutId);
              console.error(`[Trading Service] Error sending ${cmd} command:`, error);
              reject(error);
            }
          });

          this.ws.once('message', (data) => {
            clearTimeout(timeoutId);
            try {
              const response = JSON.parse(data.toString());

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
            } catch (parseError) {
              console.error(`[Trading Service] Error parsing response for ${cmd}:`, parseError, data.toString());
              reject(new Error(`Error parsing response: ${parseError.message}`));
            }
          });
        } catch (sendError) {
          clearTimeout(timeoutId);
          console.error(`[Trading Service] Error in WebSocket communication for ${cmd}:`, sendError);
          reject(sendError);
        }
      });
    } catch (error) {
      console.error(`[Trading Service] Error in sendCommand(${cmd}):`, error);
      throw error;
    }
  }

  // API Methods
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);
      
      // Ensure connection is established with same parameters as other operations
      await this.ensureConnection();
      await this.login();
      
      const response = await this.sendCommand('tradeTransactionStatus', { order: tradeNumber });
      console.log(`[Trading Service] Trade status for order ${tradeNumber}:`, response);
      return response;
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

    const tradeResponse = await this.sendCommand('tradeTransaction', { tradeTransInfo });
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

    const closeResponse = await this.sendCommand('tradeTransaction', { tradeTransInfo });
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