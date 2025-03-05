import { z } from "zod";
import fetch from 'node-fetch';
import { xtbService } from './xtbService';

// Define interfaces for API interactions
interface XTBResponse {
  success: boolean;
  error?: string;
  status?: string;
  orderId?: number;
  message?: string;
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
  private isLoggedIn = false;
  private lastLoginTime = 0;
  private readonly sessionTimeout = 20 * 60 * 1000; // 20 minutes in milliseconds

  get isConnected(): boolean {
    return this.isLoggedIn && (Date.now() - this.lastLoginTime < this.sessionTimeout);
  }

  async connect(): Promise<void> {
    try {
      await this.ensureLoggedIn();
    } catch (error) {
      console.error('[Trading Service] Connection error:', error);
      throw error;
    }
  }

  private async ensureLoggedIn(): Promise<void> {
    const currentTime = Date.now();
    if (this.isLoggedIn && (currentTime - this.lastLoginTime < this.sessionTimeout)) {
      console.log('[Trading Service] Already logged in with valid session');
      return;
    }

    console.log('[Trading Service] Logging in...');
    await this.login();
  }

  private async login(): Promise<void> {
    try {
      const response = await xtbService.login(
        process.env.XTB_USER_ID || '17535100',
        process.env.XTB_PASSWORD || 'YourPasswordHere'
      );

      if (!response.status) {
        throw new Error('Login failed');
      }

      this.isLoggedIn = true;
      this.lastLoginTime = Date.now();
      console.log('[Trading Service] Successfully logged in');
    } catch (error) {
      console.error('[Trading Service] Login error:', error);
      throw error;
    }
  }

  async executeHedge(hedgeParams: any): Promise<any> {
    try {
      console.log('[Trading Service] Executing hedge with params:', hedgeParams);
      await this.ensureLoggedIn();

      const response = await xtbService.placeTrade({
        symbol: hedgeParams.symbol,
        volume: hedgeParams.volume,
        cmd: hedgeParams.isBuy ? 0 : 1,
        type: 0, // OPEN
        customComment: `Hedge ${hedgeParams.symbol}`
      });

      console.log('[Trading Service] Hedge executed successfully:', response);
      return response;
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
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
    try {
      await this.ensureLoggedIn();

      // XTB uses standard lots where 1 lot = 100,000 units of base currency
      const adjustedVolume = volume / 100000;
      const finalVolume = Math.max(adjustedVolume, 0.01);

      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        price, originalVolume: volume, adjustedToLots: adjustedVolume, finalVolume, isBuy, customComment
      });

      const response = await xtbService.placeTrade({
        symbol,
        volume: finalVolume,
        cmd: isBuy ? 0 : 1,
        type: 0, // OPEN
        price,
        customComment
      });

      if (!response.status) {
        throw new Error(response.error || 'Trade failed');
      }

      console.log(`[Trading Service] Trade opened. Order number: ${response.returnData.order}`);
      return response.returnData.order;
    } catch (error) {
      console.error('[Trading Service] Open trade error:', error);
      throw error;
    }
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
    try {
      await this.ensureLoggedIn();

      const adjustedVolume = volume / 100000;
      const finalVolume = Math.max(adjustedVolume, 0.01);

      console.log(`[Trading Service] Closing trade for ${symbol}`, {
        positionToClose, price, originalVolume: volume, adjustedToLots: adjustedVolume, finalVolume, isBuy, customComment
      });

      const response = await xtbService.placeTrade({
        symbol,
        volume: finalVolume,
        cmd: isBuy ? 0 : 1,
        type: 2, // CLOSE
        order: positionToClose,
        customComment: `Close ${customComment}`
      });

      if (!response.status) {
        throw new Error(response.error || 'Close trade failed');
      }

      console.log(`[Trading Service] Trade closed. Order number: ${response.returnData.order}`);
      return response.returnData.order;
    } catch (error) {
      console.error('[Trading Service] Close trade error:', error);
      throw error;
    }
  }

  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      await this.ensureLoggedIn();
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await xtbService.checkTradeStatus(true);

      if (!response.status) {
        throw new Error(response.error || 'Status check failed');
      }

      console.log(`[Trading Service] Trade status response:`, response);
      return response;
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();