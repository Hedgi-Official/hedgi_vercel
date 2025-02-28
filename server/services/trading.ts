import { z } from "zod";
import fetch from 'node-fetch';

const PYTHON_BRIDGE_URL = 'http://localhost:5001';

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

export class TradingService {
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    try {
      console.log(`[Trading Service] Checking status for trade ${tradeNumber}`);

      const response = await fetch(`${PYTHON_BRIDGE_URL}/api/trade/status/${tradeNumber}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[Trading Service] Trade status response:`, data);

      return {
        command: 'tradeTransactionStatus',
        status: !data.error,
        returnData: data
      };
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
    try {
      console.log(`[Trading Service] Opening trade for ${symbol}`, {
        price, volume, isBuy, customComment
      });

      const response = await fetch(`${PYTHON_BRIDGE_URL}/api/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol,
          volume,
          price,
          isBuy,
          customComment
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open trade');
      }

      const data = await response.json();
      console.log(`[Trading Service] Trade opened. Order number: ${data.orderNumber}`);

      return data.orderNumber;
    } catch (error) {
      console.error(`[Trading Service] Error opening trade:`, error);
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
      console.log(`[Trading Service] Closing trade for ${symbol}`, {
        positionToClose, price, volume, isBuy, customComment
      });

      const response = await fetch(`${PYTHON_BRIDGE_URL}/api/trade/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: positionToClose,
          symbol,
          volume,
          price,
          isBuy,
          customComment
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to close trade');
      }

      const data = await response.json();
      console.log(`[Trading Service] Trade closed. Close order number: ${data.closeOrderNumber}`);

      return data.closeOrderNumber;
    } catch (error) {
      console.error(`[Trading Service] Error closing trade:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tradingService = new TradingService();