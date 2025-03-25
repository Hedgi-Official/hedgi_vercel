import fetch from 'node-fetch';

// Trading API response interface - based on the successful curl response
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
  error?: string; // For error responses
}

export class TradeService {
  private readonly TRADE_API_URL = 'http://3.145.164.47';

  /**
   * Open a new trade with the specified broker
   * 
   * This implementation exactly matches the working curl command:
   * curl -X POST http://3.145.164.47/trade -H "Content-Type: application/json" 
   * -d '{"broker": "activtrades", "symbol": "USDBRL", "direction": "buy", "volume": 0.1, "deviation": 5, "magic": 123456, "comment": "Hedgi test trade"}'
   * 
   * @param broker The broker to use (e.g., "activtrades", "tickmill", "fbs")
   * @param symbol The currency pair symbol (e.g., "EURUSD", "USDBRL")
   * @param direction Trade direction ("buy" or "sell")
   * @param volume Trade volume in lots (e.g., 0.1)
   * @param comment Optional comment for the trade
   * @returns The API response with trade details
   */
  async openTrade(
    broker: string = 'activtrades', // Using activtrades as the default broker as requested
    symbol: string,
    direction: 'buy' | 'sell',
    volume: number,
    comment: string = 'Hedgi test trade'
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Opening trade: ${direction} ${volume} lots of ${symbol} using broker ${broker}`);
    
    // Use exactly the same payload format as the working curl command
    const tradeData = {
      broker,
      symbol,
      direction,
      volume,
      deviation: 5,
      magic: 123456,
      comment
    };
    
    const requestBody = JSON.stringify(tradeData);
    console.log(`[TradeService] Sending trade request:`, requestBody);
    
    try {
      // Use the same fetch call as the working curl command
      const response = await fetch(`${this.TRADE_API_URL}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      
      // Get the text response for logging
      const responseText = await response.text();
      console.log(`[TradeService] Trade API raw response:`, responseText);
      
      // Parse the response JSON
      try {
        const result = JSON.parse(responseText) as TradeResponse;
        return result;
      } catch (parseError) {
        console.error(`[TradeService] JSON parse error:`, parseError);
        throw new Error(`Failed to parse trade response: ${responseText}`);
      }
    } catch (err) {
      const error = err as Error;
      console.error(`[TradeService] Error executing trade:`, error);
      throw error;
    }
  }
  
  /**
   * Close an existing trade
   * 
   * This implementation uses the same format as the working open trade curl command
   * 
   * @param broker The broker used for the trade (e.g., "activtrades", "fbs")
   * @param position The position/order number to close
   * @returns The API response with closure details
   */
  async closeTrade(
    broker: string = 'activtrades', // Using activtrades as the default broker as requested
    position: number
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Closing position ${position} with broker ${broker}`);
    
    // Format exactly like the working curl example
    const closeData = {
      broker,
      position
    };
    
    const requestBody = JSON.stringify(closeData);
    console.log(`[TradeService] Sending close request:`, requestBody);
    
    try {
      // Use same format as the working curl command
      const response = await fetch(`${this.TRADE_API_URL}/close_trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });
      
      // Get the text response for logging
      const responseText = await response.text();
      console.log(`[TradeService] Close API raw response:`, responseText);
      
      // Parse the response JSON
      try {
        const result = JSON.parse(responseText) as TradeResponse;
        return result;
      } catch (parseError) {
        console.error(`[TradeService] JSON parse error:`, parseError);
        throw new Error(`Failed to parse close response: ${responseText}`);
      }
    } catch (err) {
      const error = err as Error;
      console.error(`[TradeService] Error closing trade:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const tradeService = new TradeService();