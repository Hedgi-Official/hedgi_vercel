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

// Simple timeout for API calls - longer timeout for broker reliability
const API_TIMEOUT = 15000; // 15 seconds

export class TradeService {
  private readonly TRADE_API_URL = 'http://3.145.164.47';

  /**
   * Execute a trade using the broker API - curl passthrough implementation
   * 
   * This implementation exactly matches the working curl format that successfully completes with the broker API
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
    
    // Use the exact payload from the working curl command
    const tradeData = {
      broker,
      symbol,
      direction,
      volume,
      deviation: 5,
      magic: 123456,
      comment: comment || `Hedgi trade ${Date.now()}`
    };
    
    const tradeRequest = JSON.stringify(tradeData);
    console.log(`[TradeService] Sending trade request:`, tradeRequest);
    
    try {
      // Use the same path and headers as the working curl command
      const response = await fetch(`${this.TRADE_API_URL}/trade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        body: tradeRequest,
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      
      // Get the text response first for debugging
      const responseText = await response.text();
      console.log(`[TradeService] Raw API response:`, responseText);
      
      // Then parse it as JSON
      let result: TradeResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[TradeService] JSON parse error:`, parseError);
        // Create a minimal error response if JSON parsing fails
        return {
          ask: 0,
          bid: 0,
          comment: "Error: Unable to parse response",
          deal: 0, 
          order: 0,
          price: 0,
          request: tradeData,
          request_id: 0,
          retcode: 0,
          retcode_external: 0,
          volume: volume,
          error: `Failed to parse response: ${responseText}`
        };
      }
      
      // Return the parsed result
      return result;
      
    } catch (err) {
      const error = err as Error;
      console.error(`[TradeService] Error executing trade:`, error);
      
      // Create a standardized error response
      return {
        ask: 0,
        bid: 0,
        comment: "Error: API request failed",
        deal: 0, 
        order: 0,
        price: 0,
        request: tradeData,
        request_id: 0,
        retcode: 0,
        retcode_external: 0,
        volume: volume,
        error: `Request failed: ${error.message || String(error)}`
      };
    }
  }
  
  /**
   * Close an existing trade
   * 
   * This implementation exactly matches the working curl format that successfully completes with the broker API
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
    
    // Use the exact payload format from the working curl command
    const closeData = {
      broker,
      position
    };
    
    const closeRequest = JSON.stringify(closeData);
    console.log(`[TradeService] Sending close request:`, closeRequest);
    
    try {
      // Use the same path and headers as the working curl command
      const response = await fetch(`${this.TRADE_API_URL}/close_trade`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        body: closeRequest,
        signal: AbortSignal.timeout(API_TIMEOUT)
      });
      
      // Get the text response first for debugging
      const responseText = await response.text();
      console.log(`[TradeService] Raw close API response:`, responseText);
      
      // Then parse it as JSON
      let result: TradeResponse;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[TradeService] JSON parse error for close:`, parseError);
        // Create a minimal error response if JSON parsing fails
        return {
          ask: 0,
          bid: 0,
          comment: "Error: Unable to parse close response",
          deal: 0, 
          order: 0,
          price: 0,
          request: closeData,
          request_id: 0,
          retcode: 0,
          retcode_external: 0,
          volume: 0,
          error: `Failed to parse close response: ${responseText}`
        };
      }
      
      // Return the parsed result
      return result;
      
    } catch (err) {
      const error = err as Error;
      console.error(`[TradeService] Error closing trade:`, error);
      
      // Create a standardized error response
      return {
        ask: 0,
        bid: 0,
        comment: "Error: Close API request failed",
        deal: 0, 
        order: 0,
        price: 0,
        request: closeData,
        request_id: 0,
        retcode: 0,
        retcode_external: 0,
        volume: 0,
        error: `Close request failed: ${error.message || String(error)}`
      };
    }
  }
}

// Create singleton instance
export const tradeService = new TradeService();