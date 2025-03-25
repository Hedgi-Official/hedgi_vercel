/**
 * DEPRECATED: This file is kept for type compatibility only.
 * 
 * The API interactions have been moved to tradeService.ts which uses
 * a curl-based API approach that communicates directly with brokers.
 */

// Define consistent types to maintain compatibility with existing code
export interface XTBResponse {
  status: boolean;
  returnData?: any;
  error?: string;
  errorDescr?: string;
  message?: string;
}

// Dummy TradingService that logs deprecation warnings and returns errors
export class TradingService {
  get isConnected(): boolean {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return false;
  }
  
  async connect(): Promise<boolean> {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return false;
  }
  
  async openTrade(): Promise<XTBResponse> {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return {
      status: false,
      error: "DEPRECATED API",
      errorDescr: "The XTB TradingService has been replaced. Use tradeService instead."
    };
  }
  
  async closeTrade(): Promise<XTBResponse> {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return {
      status: false,
      error: "DEPRECATED API",
      errorDescr: "The XTB TradingService has been replaced. Use tradeService instead."
    };
  }
  
  async getSymbolData(): Promise<XTBResponse> {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return {
      status: false,
      error: "DEPRECATED API",
      errorDescr: "The XTB TradingService has been replaced. Use tradeService instead."
    };
  }
  
  async checkTradeStatus(): Promise<XTBResponse> {
    console.warn('[DEPRECATED] The old XTB TradingService has been replaced with the new broker API');
    return {
      status: false,
      error: "DEPRECATED API",
      errorDescr: "The XTB TradingService has been replaced. Use tradeService instead."
    };
  }
}

// Export dummy service for compatibility
export const tradingService = new TradingService();