import fetch from 'node-fetch';
import { db } from '@db';
import { trades } from '@db/schema';
import { eq } from 'drizzle-orm';

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
  // MT5 specific fields that might be in the response
  custom_order?: {
    ticket: number;
    symbol: string;
    volume: number;
    open_time: number; // Unix timestamp
    duration_days: number;
  };
  message?: string; // Contains broker information in some responses
}

// Interface for the response from the GET /api/trades/open endpoint
export interface OpenTradeResponse {
  id: number;
  symbol: string;
  volume: string; // Formatted as "0.20 lots"
  openTime: string; // ISO formatted date
  status: string; // Status from Flask API
  flaskTradeId: number;
}

// Interface for the response from the GET /api/trades/closed endpoint
export interface ClosedTradeResponse extends OpenTradeResponse {
  closedAt: string; // ISO formatted date
  status: string; // cancelled or closed_by_sl
}

export class TradeService {
  private readonly TRADE_API_URL = 'http://3.145.164.47';
  
  /**
   * Creates a trade record from the MT5 response
   * @param response MT5 API response
   * @param userId User ID
   * @param hedgeId Hedge ID
   * @returns The created trade record
   */
  async createTradeRecord(response: TradeResponse, userId: number, hedgeId?: number) {
    console.log(`[TradeService] Parsing trade response to create trade record`);
    
    try {
      // Extract broker from message if available
      let broker = 'tickmill'; // Default broker
      if (response.message) {
        const brokerMatch = response.message.match(/on broker (.+) with/);
        if (brokerMatch && brokerMatch[1]) {
          broker = brokerMatch[1];
        }
      }
      
      // Create trade record from response
      let ticket = '';
      let symbol = '';
      let volume = 0;
      let openTime = new Date();
      let durationDays = 30; // Default duration
      
      // Parse fields from custom_order if available
      if (response.custom_order) {
        ticket = response.custom_order.ticket.toString();
        symbol = response.custom_order.symbol;
        volume = response.custom_order.volume;
        openTime = new Date(response.custom_order.open_time * 1000); // Convert Unix timestamp to Date
        durationDays = response.custom_order.duration_days;
      } else {
        // Fallback to order number if no custom_order available
        ticket = response.order.toString();
        // Try to extract symbol and volume from request
        if (response.request && typeof response.request === 'object') {
          symbol = response.request.symbol || '';
          volume = response.request.volume || 0;
        }
      }
      
      // Use raw SQLite for trade record insertion to avoid field mapping issues
      const Database = require('better-sqlite3');
      const sqlite = new Database('./hedgi.db');
      
      const insertStmt = sqlite.prepare(`
        INSERT INTO trades (
          user_id, ticket, broker, volume, symbol, open_time, 
          duration_days, status, hedge_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = insertStmt.run(
        userId,
        ticket,
        broker,
        volume,
        symbol,
        openTime.toISOString(),
        durationDays,
        'open',
        hedgeId || null
      );

      // Get the inserted trade
      const selectStmt = sqlite.prepare('SELECT * FROM trades WHERE id = ?');
      const newTrade = selectStmt.get(result.lastInsertRowid);
      
      sqlite.close();
      console.log(`[TradeService] Created trade record:`, newTrade);
      return newTrade;
    } catch (error) {
      console.error(`[TradeService] Error creating trade record:`, error);
      throw error;
    }
  }
  
  /**
   * Get all open trades for a user
   * @param userId User ID
   * @returns List of open trades with non-sensitive fields
   */
  async getOpenTrades(userId: number): Promise<OpenTradeResponse[]> {
    try {
      const allTrades = await db.query.trades.findMany({
        where: (trade, { eq }) => eq(trade.userId, userId)
      });
      
      const openTrades = [];
      
      // Check each trade's status with Flask
      for (const trade of allTrades) {
        if (!trade.flaskTradeId) continue;
        
        try {
          const flaskResponse = await fetch(`${process.env.FLASK_URL || 'http://3.145.164.47'}/trades/${trade.flaskTradeId}/status`);
          const flaskData = await flaskResponse.json();
          
          // Only include trades that are still active (not closed)
          if (flaskData.status && flaskData.status !== 'Closed') {
            let openTimeStr: string;
            try {
              openTimeStr = typeof trade.openTime === 'string' ? trade.openTime : new Date(trade.openTime).toISOString();
            } catch (e) {
              openTimeStr = new Date().toISOString();
            }
            
            openTrades.push({
              id: trade.id,
              symbol: trade.symbol,
              volume: `${Number(trade.volume).toFixed(2)} lots`,
              openTime: openTimeStr,
              status: flaskData.status,
              flaskTradeId: trade.flaskTradeId
            });
          }
        } catch (error) {
          console.error(`[TradeService] Error fetching status for trade ${trade.id}:`, error);
          // Include trade with unknown status if Flask is unreachable
          let openTimeStr: string;
          try {
            openTimeStr = typeof trade.openTime === 'string' ? trade.openTime : new Date(trade.openTime).toISOString();
          } catch (e) {
            openTimeStr = new Date().toISOString();
          }
          
          openTrades.push({
            id: trade.id,
            symbol: trade.symbol,
            volume: `${Number(trade.volume).toFixed(2)} lots`,
            openTime: openTimeStr,
            status: 'Unknown',
            flaskTradeId: trade.flaskTradeId
          });
        }
      }
      
      return openTrades;
    } catch (error) {
      console.error(`[TradeService] Error fetching open trades:`, error);
      throw error;
    }
  }
  
  /**
   * Get all closed trades for a user
   * @param userId User ID
   * @returns List of closed trades with non-sensitive fields
   */
  async getClosedTrades(userId: number): Promise<ClosedTradeResponse[]> {
    try {
      const closedTrades = await db.query.trades.findMany({
        where: (trade, { eq, and, ne }) => and(
          eq(trade.userId, userId),
          ne(trade.status, 'open')
        )
      });
      
      // Map to API response format with only non-sensitive fields
      return closedTrades.map(trade => ({
        symbol: trade.symbol,
        volume: `${Number(trade.volume).toFixed(2)} lots`,
        openTime: typeof trade.openTime === 'string' ? trade.openTime : new Date(trade.openTime).toISOString(),
        closedAt: trade.closedAt ? (typeof trade.closedAt === 'string' ? trade.closedAt : new Date(trade.closedAt).toISOString()) : new Date().toISOString(),
        status: trade.status
      }));
    } catch (error) {
      console.error(`[TradeService] Error fetching closed trades:`, error);
      throw error;
    }
  }
  
  /**
   * Cancel a trade by order number
   * @param tradeOrderNumber Internal DB record ID
   * @param userId User ID
   * @returns API response from MT5
   */
  async cancelTrade(tradeOrderNumber: number, userId: number): Promise<{status: boolean, message?: string, error?: string}> {
    try {
      // Find the trade record
      const trade = await db.query.trades.findFirst({
        where: (t, { eq, and }) => and(
          eq(t.id, tradeOrderNumber),
          eq(t.userId, userId)
        )
      });
      
      if (!trade) {
        return {
          status: false,
          error: `Trade with ID ${tradeOrderNumber} not found`
        };
      }
      
      // Extract ticket and broker from the trade record
      const { ticket, broker } = trade;
      
      // Call MT5 API to close the trade by magic number
      const response = await fetch(`${this.TRADE_API_URL}/close_trade_by_ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: parseInt(ticket, 10),
          broker,
          comment: 'User-initiated cancel'
        })
      });
      
      const responseText = await response.text();
      console.log(`[TradeService] Cancel trade API response:`, responseText);
      
      try {
        const result = JSON.parse(responseText);
        
        // Update trade status to cancelled
        if (result.retcode === 0 || result.retcode === 10009) {
          await db.update(trades)
            .set({
              status: 'cancelled',
              closedAt: new Date()
            })
            .where(eq(trades.id, tradeOrderNumber));
            
          return {
            status: true,
            message: 'Trade cancelled successfully'
          };
        } else {
          return {
            status: false,
            error: result.error || `Failed to cancel trade: ${result.comment || 'Unknown error'}`
          };
        }
      } catch (parseError) {
        console.error(`[TradeService] Error parsing cancel response:`, parseError);
        return {
          status: false,
          error: `Failed to parse API response: ${responseText.substring(0, 200)}`
        };
      }
    } catch (error) {
      console.error(`[TradeService] Error cancelling trade:`, error);
      return {
        status: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

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
    symbol: string,
    direction: 'buy' | 'sell',
    volume: number,
    duration: number
  ): Promise<TradeResponse> {
    console.log(`[TradeService] Opening trading: ${direction} ${volume} lots of ${symbol}`);

    // Use EXACTLY the same payload format as the working curl command
    const tradeData = {
      symbol,
      direction,
      volume,
      days: duration,
      deviation: 5,
      magic: 123456,
      comment: "Hedgi test trading"
    };

    const requestBody = JSON.stringify(tradeData);
    console.log(`[TradeService] Sending trade request:`, requestBody);

    try {
      // Send the request exactly like the working curl
      const response = await fetch(`${this.TRADE_API_URL}/hedge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });

      // Read raw text for full logging
      const responseText = await response.text();
      console.log(`[TradeService] Trade API raw response:`, responseText);

      try {
        // First parse into the envelope containing your real payload
        const outer = JSON.parse(responseText) as {
          trade_details: TradeResponse;
          message?: string;
          custom_order?: TradeResponse['custom_order'];
          error?: string;
        };

        // ⇩ Pivot: lift the real payload up one level ⇩
        const result: TradeResponse = {
          ...outer.trade_details,
          message: outer.message,
          custom_order: outer.custom_order,
          error: outer.error
        };
        // ⇧ End pivot ⇧

        console.log(
          `[TradeService] Trade response details - order: ${result.order}, deal: ${result.deal}, comment: ${result.comment}`
        );

        // Preserve "no money" warnings but treat "market closed" as error
        if (result.order === 0) {
          console.log(`[TradeService] Received order number 0. Comment: ${result.comment}`);
          if (result.comment === "Market closed") {
            result.error = "Market is currently closed. Please try again during market hours.";
          }
        }

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
    
    // CRITICAL FIX: The trade API expects position as a NUMBER without quotes
    // Convert to a number and create a raw JSON string with numeric position
    let parsedPosition: number;
    
    // Parse the position to a number regardless of input type
    if (typeof position === 'string') {
      parsedPosition = parseInt(position, 10);
    } else {
      parsedPosition = position;
    }
    
    // Check if parsing resulted in a valid number
    if (isNaN(parsedPosition)) {
      console.error(`[TradeService] Invalid position number: ${position}`);
      throw new Error(`Invalid position number: ${position}`);
    }
    
    // IMPORTANT: We need to manually construct the correct JSON format
    // where the position is a number WITHOUT quotes
    const requestBody = `{"broker":"${broker}","position":${parsedPosition}}`; 
    
    // Log the exact body we're sending to verify format
    console.log(`[TradeService] Sending raw request body: ${requestBody}`);
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
        
        // Handle market closed responses
        if (result.comment === "Market closed") {
          console.warn(`[TradeService] Market is closed, can't close position ${position}`);
          return {
            ask: 0,
            bid: 0,
            comment: "Market closed",
            deal: 0,
            order: 0,
            price: 0,
            request: { position, broker },
            request_id: Date.now(),
            retcode: 10018, // Market closed retcode
            retcode_external: 0,
            volume: 0,
            error: "Market is currently closed. Please try again during market hours."
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