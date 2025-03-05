import { z } from "zod";
import { xtbService } from './xtbService';

// Define interfaces for API interactions
interface XTBResponse {
  success: boolean;
  error?: string;
  status?: string;
  orderId?: number;
  message?: string;
  errorDescr?: string;
  returnData?: {order:number}
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

  async executeCommand(command: string, args: any = {}): Promise<any> {
    await this.ensureLoggedIn();
    return xtbService.executeCommand(command, args);
  }

  async executeHedge(hedgeParams: any): Promise<any> {
    try {
      await this.ensureLoggedIn();

      // Validate and format parameters
      if (!hedgeParams.symbol || typeof hedgeParams.volume !== 'number' || typeof hedgeParams.isBuy !== 'boolean') {
        throw new Error('Invalid hedge parameters');
      }

      // Format symbol and calculate volume in lots
      const symbol = hedgeParams.symbol.toUpperCase();
      const volumeInLots = Math.max(hedgeParams.volume / 100000, 0.01);

      console.log('[Trading Service] Processing hedge request:', {
        symbol,
        originalVolume: hedgeParams.volume,
        volumeInLots,
        isBuy: hedgeParams.isBuy
      });

      const response = await xtbService.placeTrade({
        symbol,
        volume: volumeInLots,
        cmd: hedgeParams.isBuy ? 0 : 1, // Ensure correct direction: 0 for BUY, 1 for SELL
        type: 0, // OPEN
        customComment: `Hedge ${symbol}`
      });

      console.log('[Trading Service] Hedge execution response:', response);

      if (!response.status) {
        throw new Error(response.errorDescr || 'Hedge execution failed');
      }

      return response;
    } catch (error) {
      console.error('[Trading Service] Hedge execution error:', error);
      throw error;
    }
  }

  async openTrade(
    symbol: string,
    volume: number,
    isBuy: boolean,
    price: number = 0.0,
    customComment: string = ""
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      const volumeInLots = Math.max(volume / 100000, 0.01);
      const formattedSymbol = symbol.toUpperCase();

      console.log('[Trading Service] Opening trade:', {
        symbol: formattedSymbol,
        originalVolume: volume,
        volumeInLots,
        isBuy,
        price,
        customComment
      });

      const response = await xtbService.placeTrade({
        symbol: formattedSymbol,
        volume: volumeInLots,
        cmd: isBuy ? 0 : 1,
        type: 0, // OPEN
        price,
        customComment
      });

      if (!response.status) {
        throw new Error(response.errorDescr || 'Trade failed');
      }

      console.log('[Trading Service] Trade opened:', response);
      return response.returnData.order;
    } catch (error) {
      console.error('[Trading Service] Open trade error:', error);
      throw error;
    }
  }

  async closeTrade(
    symbol: string,
    positionToClose: number,
    volume: number,
    isBuy: boolean,
    customComment: string = ""
  ): Promise<number> {
    try {
      await this.ensureLoggedIn();

      const volumeInLots = Math.max(volume / 100000, 0.01);
      const formattedSymbol = symbol.toUpperCase();

      console.log('[Trading Service] Closing trade:', {
        symbol: formattedSymbol,
        positionToClose,
        originalVolume: volume,
        volumeInLots,
        isBuy,
        customComment
      });

      const response = await xtbService.placeTrade({
        symbol: formattedSymbol,
        volume: volumeInLots,
        cmd: isBuy ? 0 : 1,
        type: 2, // CLOSE
        order: positionToClose,
        customComment: `Close ${customComment}`
      });

      if (!response.status) {
        throw new Error(response.errorDescr || 'Close trade failed');
      }

      console.log('[Trading Service] Trade closed:', response);
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

      const response = await xtbService.checkTradeStatus(tradeNumber);

      if (!response.status) {
        throw new Error(response.errorDescr || 'Status check failed');
      }

      console.log(`[Trading Service] Trade status response:`, response);
      return response;
    } catch (error) {
      console.error(`[Trading Service] Status check error:`, error);
      throw error;
    }
  }
}

export const tradingService = new TradingService();