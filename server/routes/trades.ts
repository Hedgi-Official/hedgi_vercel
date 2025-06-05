
import express, { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '@db';
import { trades } from '@db/schema';

const router = express.Router();

/**
 * Create a new trade
 */
router.post('/api/trades', async (req: Request, res: Response) => {
  try {
    const { symbol, direction, volume, metadata } = req.body;

    console.log('[Trades API] Creating trade:', { symbol, direction, volume, metadata });

    // Validate required fields
    if (!symbol || !direction || !volume) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Required fields: symbol, direction, volume'
      });
    }

    // Validate direction
    if (!['buy', 'sell'].includes(direction)) {
      return res.status(400).json({
        error: 'Invalid direction',
        details: 'Direction must be either "buy" or "sell"'
      });
    }

    // Validate volume
    const volumeNum = Number(volume);
    if (isNaN(volumeNum) || volumeNum <= 0) {
      return res.status(400).json({
        error: 'Invalid volume',
        details: 'Volume must be a positive number'
      });
    }

    // First try to call Flask API to create the trade
    try {
      const FLASK_BASE_URL = process.env.FLASK_URL || "http://3.145.164.47";
      
      const flaskPayload = {
        symbol,
        direction,
        volume: volumeNum,
        metadata: {
          days: metadata?.days || 7,
          paymentToken: metadata?.paymentToken || `local_trade_${Date.now()}`,
          margin: metadata?.margin || 500
        }
      };

      console.log('[Trades API → Flask] Sending trade to Flask:', flaskPayload);

      const flaskResponse = await fetch(`${FLASK_BASE_URL}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flaskPayload)
      });

      if (flaskResponse.ok) {
        const flaskResult = await flaskResponse.json();
        console.log('[Trades API → Flask] Flask trade created:', flaskResult);

        // Also store the trade in our local database
        const localTrade = await db.insert(trades).values({
          userId: req.user?.id || 7, // Default to user 7 for now
          ticket: `FLASK-${flaskResult.id}`,
          broker: 'flask',
          symbol: flaskResult.symbol,
          volume: flaskResult.volume,
          openTime: new Date(),
          durationDays: metadata?.days || 7,
          status: 'open',
          flaskTradeId: flaskResult.id,
          metadata: {
            paymentToken: metadata?.paymentToken,
            direction: flaskResult.direction,
            flaskResponse: flaskResult
          }
        }).returning();

        console.log('[Trades API] Local trade record created:', localTrade[0]);

        return res.json({
          success: true,
          trade: flaskResult,
          localTrade: localTrade[0],
          source: 'flask'
        });
      } else {
        const flaskError = await flaskResponse.text();
        console.error('[Trades API → Flask] Flask error:', flaskError);
        
        // Fall back to local trade creation
        console.log('[Trades API] Falling back to local trade creation');
      }
    } catch (flaskError) {
      console.error('[Trades API → Flask] Flask communication error:', flaskError);
      console.log('[Trades API] Falling back to local trade creation');
    }

    // Fallback: Create trade locally
    const localTrade = await db.insert(trades).values({
      userId: req.user?.id || 7, // Default to user 7 for now
      ticket: `LOCAL-${Date.now()}`,
      broker: 'local',
      symbol,
      volume: volumeNum,
      openTime: new Date(),
      durationDays: metadata?.days || 7,
      status: 'open',
      metadata: {
        direction,
        paymentToken: metadata?.paymentToken,
        margin: metadata?.margin || 500,
        source: 'local_fallback'
      }
    }).returning();

    console.log('[Trades API] Local trade created:', localTrade[0]);

    return res.json({
      success: true,
      trade: localTrade[0],
      source: 'local'
    });

  } catch (error) {
    console.error('[Trades API] Error creating trade:', error);
    return res.status(500).json({
      error: 'Failed to create trade',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all trades for the current user
 */
router.get('/api/trades', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 7; // Default to user 7 for now
    
    console.log('[Trades API] Getting trades for user:', userId);

    const userTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(desc(trades.openTime));

    // Filter only active trades
    const activeTrades = userTrades.filter(trade => trade.status === 'open');

    console.log(`[Trades API] Found ${userTrades.length} total trades, ${activeTrades.length} active`);

    return res.json(activeTrades);
  } catch (error) {
    console.error('[Trades API] Error fetching trades:', error);
    return res.status(500).json({
      error: 'Failed to fetch trades',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
