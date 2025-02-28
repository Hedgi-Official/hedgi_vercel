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

  /**
   * Gets the detailed status of a trade with formatted request status description
   * @param tradeNumber The order number to check
   * @returns Formatted trade status with request status description
   */
  async getFormattedTradeStatus(tradeNumber: number): Promise<{
    customComment: string;
    message: string | null;
    order: number;
    price: number;
    requestStatus: number;
    statusDescription: string;
  }> {
    try {
      console.log(`[Trading Service] Getting formatted status for trade ${tradeNumber}`);
      
      // Ensure we're logged in
      await this.ensureLoggedIn();

      // Get the trade status
      const response = await this.sendCommandWithoutLogin('tradeTransactionStatus', { order: tradeNumber });
      
      if (!response.status) {
        throw new Error(response.errorCode ? `${response.errorDescr} (${response.errorCode})` : 'Status check failed');
      }

      // Format the response according to STREAMING_TRADE_STATUS_RECORD
      const statusCode = response.returnData.requestStatus;
      let statusDescription = 'UNKNOWN';
      
      // Map the status code to description
      switch (statusCode) {
        case 0:
          statusDescription = 'ERROR';
          break;
        case 1:
          statusDescription = 'PENDING';
          break;
        case 3:
          statusDescription = 'ACCEPTED';
          break;
        case 4:
          statusDescription = 'REJECTED';
          break;
      }

      const formattedStatus = {
        customComment: response.returnData.customComment || '',
        message: response.returnData.message || null,
        order: response.returnData.order,
        price: response.returnData.price || 0,
        requestStatus: statusCode,
        statusDescription,
      };

      console.log(`[Trading Service] Formatted trade status for order ${tradeNumber}:`, formattedStatus);
      return formattedStatus;
    } catch (error) {
      console.error(`[Trading Service] Error getting formatted trade status for order ${tradeNumber}:`, error);
      throw error;
    }
  }

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
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeoutId = setTimeout(() => {
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

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          clearTimeout(timeoutId);
          console.error(`[Trading Service] Error sending ${cmd} command:`, error);
          reject(error);
        }
      });

      this.ws.once('message', (data) => {
        clearTimeout(timeoutId);
        const response = JSON.parse(data.toString());

        console.log(`[Trading Service] Received response for ${cmd}:`, {
          status: response.status,
          hasReturnData: !!response.returnData
        });

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
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      // Ensure we're logged in
      await this.ensureLoggedIn();

      const response = await this.sendCommandWithoutLogin('tradeTransactionStatus', { order: tradeNumber });
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