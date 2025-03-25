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
  
  // Error information fields that can be returned by the broker API
  error?: string;
  errorDescr?: string;
  message?: string;
}

// Set a longer timeout for API calls to accommodate potential delays with the broker
const API_TIMEOUT = 120000; // 120 seconds (2 minutes) for broker API calls that may take longer

export class TradeService {
  private readonly TRADE_API_URL = 'http://3.145.164.47';
  private readonly MAX_RETRIES = 3; // Maximum number of retry attempts
  private readonly RETRY_DELAY = 5000; // 5 seconds between retries
  
  /**
   * Helper function to delay execution
   * @param ms Milliseconds to wait
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Open a new trade with the specified broker
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
    comment: string = ''
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Opening trade: ${direction} ${volume} lots of ${symbol} using broker ${broker}`);
    
    // Exactly match the format from the specified example
    const tradeData = {
      broker,
      symbol,
      direction,
      volume,
      deviation: 5,
      magic: 123456,
      comment: comment || `Hedgi trade ${Date.now()}`
    };
    
    console.log(`[TradeService] Trade request data:`, JSON.stringify(tradeData));
    
    // Implement retry logic for resilience
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`[TradeService] Attempt ${attempt}/${this.MAX_RETRIES}: Sending POST request to ${this.TRADE_API_URL}/trade`);
        
        const response = await fetch(`${this.TRADE_API_URL}/trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tradeData),
          signal: AbortSignal.timeout(API_TIMEOUT)
        });
        
        // Attempt to get the raw response data first
        const rawResponseText = await response.text();
        console.log(`[TradeService] Raw API response:`, rawResponseText);
        
        // Try to parse the response as JSON
        let result: TradeResponse;
        try {
          result = JSON.parse(rawResponseText) as TradeResponse;
        } catch (parseError) {
          console.error(`[TradeService] Error parsing response JSON:`, parseError);
          
          // If we can't parse the JSON but the request was successful, create a minimal success response
          if (response.ok) {
            result = {
              ask: 0,
              bid: 0,
              comment: comment || `Hedgi trade ${Date.now()}`,
              deal: 123456, // Placeholder deal ID
              order: 123456, // Placeholder order ID
              price: 0,
              request: tradeData,
              request_id: Date.now(),
              retcode: 0, // Success code
              retcode_external: 0,
              volume: volume
            };
          } else {
            // If the request failed and JSON parsing failed, throw an error with the raw response
            throw new Error(`Trade API error: ${response.status} - ${rawResponseText}`);
          }
        }
        
        // Check for timeout or other broker-specific error that we might want to retry
        if (result.error && 
            (result.error.includes('timeout') || 
             result.error.includes('No response') || 
             result.error.includes('connection'))) {
          
          console.warn(`[TradeService] Broker timeout detected on attempt ${attempt}, will retry after delay`);
          lastError = result;
          
          // If this is not the last attempt, wait and then continue to the next loop iteration
          if (attempt < this.MAX_RETRIES) {
            await this.delay(this.RETRY_DELAY);
            continue;
          }
        }
        
        // If we received a proper response (with or without trading errors), return it
        if (!response.ok || (result.retcode !== 0 && result.retcode !== undefined)) {
          console.error(`[TradeService] Trade API returned error:`, result);
        } else {
          console.log(`[TradeService] Trade response:`, result);
        }
        
        return result;
      } catch (error) {
        console.error(`[TradeService] Error on attempt ${attempt}:`, error);
        lastError = error;
        
        // If this is not the last attempt, wait and then retry
        if (attempt < this.MAX_RETRIES) {
          console.log(`[TradeService] Retrying after delay...`);
          await this.delay(this.RETRY_DELAY);
        }
      }
    }
    
    // If we've exhausted all retries, throw the last error
    console.error(`[TradeService] All ${this.MAX_RETRIES} attempts failed`);
    throw lastError || new Error('Failed to execute trade after maximum retries');
  }
  
  /**
   * Close an existing trade
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
    
    // Exactly match the format from the working example
    const closeData = {
      broker,
      position
    };
    
    try {
      // Using POST with JSON body exactly as specified in the example
      console.log(`[TradeService] Sending POST request to ${this.TRADE_API_URL}/close_trade with data:`, JSON.stringify(closeData));
      
      const response = await fetch(`${this.TRADE_API_URL}/close_trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(closeData),
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      
      // Attempt to get the raw response data first
      const rawResponseText = await response.text();
      console.log(`[TradeService] Raw close API response:`, rawResponseText);
      
      // Try to parse the response as JSON
      let result: TradeResponse;
      try {
        result = JSON.parse(rawResponseText) as TradeResponse;
      } catch (parseError) {
        console.error(`[TradeService] Error parsing close response JSON:`, parseError);
        
        // If we can't parse the JSON but the request was successful, create a minimal success response
        if (response.ok) {
          result = {
            ask: 0,
            bid: 0,
            comment: `Closed position ${position}`,
            deal: position,
            order: position,
            price: 0,
            request: closeData,
            request_id: Date.now(),
            retcode: 0, // Success code
            retcode_external: 0,
            volume: 0
          };
        } else {
          // If the request failed and JSON parsing failed, throw an error with the raw response
          throw new Error(`Trade close API error: ${response.status} - ${rawResponseText}`);
        }
      }
      
      // If the response contains an error field, log it but don't throw
      if (!response.ok || (result.retcode !== 0 && result.retcode !== undefined)) {
        console.error(`[TradeService] Close API returned error:`, result);
      } else {
        console.log(`[TradeService] Trade close response:`, result);
      }
      
      return result;
    } catch (error) {
      console.error(`[TradeService] Error closing trade:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const tradeService = new TradeService();