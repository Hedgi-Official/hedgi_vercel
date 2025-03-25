import fetch from 'node-fetch';

// Trading API response interface
export interface TradeResponse {
  ask: number;
  bid: number;
  comment: string;
  deal: number;
  order: number;
  price: number;
  request: any;
  request_id: number;
  retcode: number;
  retcode_external: number;
  volume: number;
}

// Set a reasonable timeout for API calls
const API_TIMEOUT = 30000; // 30 seconds

export class TradeService {
  private readonly TRADE_API_URL = 'http://3.145.164.47';
  
  /**
   * Open a new trade with the specified broker
   * 
   * @param broker The broker to use (e.g., "activtrades", "fbs")
   * @param symbol The currency pair symbol (e.g., "EURUSD", "USDBRL")
   * @param direction Trade direction ("buy" or "sell")
   * @param volume Trade volume in lots (e.g., 0.1)
   * @param comment Optional comment for the trade
   * @returns The API response with trade details
   */
  async openTrade(
    broker: string = 'activtrades', // Using activtrades as the default broker
    symbol: string,
    direction: 'buy' | 'sell',
    volume: number,
    comment: string = ''
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Opening trade: ${direction} ${volume} lots of ${symbol} using broker ${broker}`);
    
    // Exactly match the format from the working example
    const tradeData = {
      broker,
      symbol,
      direction,
      volume,
      deviation: 5,
      magic: 123456,
      comment: comment || `Hedgi trade ${Date.now()}`
    };
    
    console.log(`[TradeService] Trade request data:`, tradeData);
    
    try {
      const response = await fetch(`${this.TRADE_API_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradeData),
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Trade API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json() as TradeResponse;
      console.log(`[TradeService] Trade response:`, result);
      
      return result;
    } catch (error) {
      console.error(`[TradeService] Error placing trade:`, error);
      throw error;
    }
  }
  
  /**
   * Close an existing trade
   * 
   * @param broker The broker used for the trade (e.g., "activtrades", "fbs")
   * @param position The position/order number to close
   * @returns The API response with closure details
   */
  async closeTrade(
    broker: string = 'activtrades', // Using activtrades as the default broker
    position: number
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Closing position ${position} with broker ${broker}`);
    
    // Exactly match the format from the working example
    const closeData = {
      broker,
      position
    };
    
    try {
      const response = await fetch(`${this.TRADE_API_URL}/close_trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeData),
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Trade close API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json() as TradeResponse;
      console.log(`[TradeService] Trade close response:`, result);
      
      return result;
    } catch (error) {
      console.error(`[TradeService] Error closing trade:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const tradeService = new TradeService();