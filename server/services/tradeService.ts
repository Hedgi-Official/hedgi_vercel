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
   * @returns The API response with trade details
   */
  async openTrade(
    broker: string = 'tickmill',
    symbol: string,
    direction: 'buy' | 'sell',
    volume: number
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Opening trade: ${direction} ${volume} lots of ${symbol} using broker ${broker}`);
    
    // Use EXACTLY the same payload format as the working curl command
    const tradeData = {
      broker,
      symbol,
      direction,
      volume,
      deviation: 5,
      magic: 123456,
      comment: "Hedgi test trade"
    };
    
    const requestBody = JSON.stringify(tradeData);
    console.log(`[TradeService] Sending trade request:`, requestBody);
    
    try {
      // Use exactly the same fetch call as the working curl command
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
   * This implementation matches the working curl command format exactly:
   * curl -X POST "http://3.145.164.47/close_trade" -H "Content-Type: application/json" 
   * -d "{\"broker\":\"fbs\",\"position\":769221201}"
   * 
   * @param broker The broker used for the trade (e.g., "activtrades", "fbs")
   * @param position The position/order number to close
   * @returns The API response with closure details
   */
  async closeTrade(
    broker: string = 'tickmill',
    position: number | string
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Closing position ${position} with broker ${broker}`);
    
    // Enhanced error handling for position validation
    if (!position) {
      console.error('[TradeService] Cannot close trade: Missing position number');
      throw new Error('Missing position number');
    }
    
    // The API expects position as a raw value (string or number) without any formatting
    // Never convert or modify the position value as it must match exactly what the API expects
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
      
      // Parse the response JSON - with improved error handling
      try {
        // If the response doesn't parse as JSON, it may be HTML or another format
        const result = JSON.parse(responseText) as TradeResponse;
        
        // Handle "Position not found" as a special case to provide better error information
        if (result.error && result.error.includes('not found')) {
          console.warn(`[TradeService] Position ${position} not found at broker ${broker}`);
          // Return a structured error response instead of throwing
          return {
            ask: 0,
            bid: 0,
            comment: `Position ${position} not found at broker ${broker}`,
            deal: 0,
            order: 0,
            price: 0,
            request: { position, broker },
            request_id: Date.now(),
            retcode: 404, // Use a code to indicate not found
            retcode_external: 0,
            volume: 0,
            error: `Position ${position} not found at broker ${broker}`
          };
        }
        
        return result;
      } catch (parseError) {
        console.error(`[TradeService] JSON parse error:`, parseError);
        // If we can't parse the response, it might be an HTML error page or other non-JSON response
        throw new Error(`Failed to parse close response. The server may be down or returned HTML: ${responseText.substring(0, 200)}...`);
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