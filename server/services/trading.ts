import { z } from "zod";

// Define interfaces for API interactions
interface XTBResponse {
  command: string;
  info?: string;
  status?: number;
  arguments: any;
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
  private async sendCommand(command: string, args: any): Promise<XTBResponse> {
    // Here we would typically make the actual API call
    // For now, we'll simulate the API response
    console.log(`[Trading Service] Sending command: ${command}`, args);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          command,
          arguments: { 
            order: Math.floor(Math.random() * 1000) + 1,
            status: "Accepted"
          }
        });
      }, 500);
    });
  }

  // Get current market data for a symbol
  async getSymbolData(symbol: string): Promise<XTBResponse> {
    return this.sendCommand('getSymbol', { symbol });
  }

  // Open a new trade position
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
    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 0 : 1,
      customComment,
      expiration,
      order: 0,
      price,
      sl,
      tp,
      symbol,
      type: 0, // Open position
      volume,
    });

    const response = await this.sendCommand('tradeTransaction', { tradeTransInfo });
    const tradeNumber = response.arguments.order;
    console.log(`[Trading Service] Trade opened. Order number: ${tradeNumber}`);
    return tradeNumber;
  }

  // Check the status of a trade
  async checkTradeStatus(tradeNumber: number): Promise<XTBResponse> {
    const response = await this.sendCommand('tradeTransactionStatus', { order: tradeNumber });
    console.log(`[Trading Service] Trade status for order ${tradeNumber}:`, response);
    return response;
  }

  // Close an existing trade position
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
    const tradeTransInfo = tradeTransInfoSchema.parse({
      cmd: isBuy ? 1 : 0, // Opposite of opening command
      customComment,
      expiration,
      order: positionToClose,
      price,
      sl,
      tp,
      symbol,
      type: 2, // Close position
      volume,
    });

    const response = await this.sendCommand('tradeTransaction', { tradeTransInfo });
    const closingOrderNumber = response.arguments.order;
    console.log(`[Trading Service] Trade closed. Closing order number: ${closingOrderNumber}`);
    return closingOrderNumber;
  }
}

export const tradingService = new TradingService();
