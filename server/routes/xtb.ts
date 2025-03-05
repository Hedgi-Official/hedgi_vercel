import { Router } from 'express';
import { tradingService } from '../services/trading';

const router = Router();

// Initialize XTB connection with backend credentials
const initializeXTB = async () => {
  try {
    await tradingService.connect();
    console.log('[XTB Backend] Connected successfully');
    return true;
  } catch (error) {
    console.error('[XTB Backend] Connection error:', error);
    return false;
  }
};

// Initialize connection when the server starts
initializeXTB();

router.post('/api/xtb/hedge', async (req, res) => {
  try {
    if (!tradingService.isConnected) {
      await initializeXTB();
    }

    const { symbol, volume, isBuy } = req.body;

    // Validate required parameters
    if (!symbol || typeof volume !== 'number' || typeof isBuy !== 'boolean') {
      console.error('[XTB Backend] Invalid trade parameters:', req.body);
      return res.status(400).json({ 
        error: 'Invalid trade parameters. Required: symbol (string), volume (number), isBuy (boolean)' 
      });
    }

    console.log('[XTB Backend] Opening trade:', { symbol, volume, isBuy });
    const hedgeResult = await tradingService.executeHedge({
      symbol: symbol.toUpperCase(), // Ensure proper currency pair format
      volume: volume,
      isBuy: isBuy
    });

    res.json(hedgeResult);
  } catch (error) {
    console.error('[XTB Backend] Error executing hedge:', error);
    res.status(500).json({ error: 'Failed to execute hedge' });
  }
});

router.get('/api/xtb/rates', async (req, res) => {
  try {
    if (!tradingService.isConnected) {
      await initializeXTB();
    }

    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      // Use executeCommand directly with proper format
      const symbolResponse = await tradingService.executeCommand('getSymbol', { symbol });

      if (!symbolResponse.status || !symbolResponse.returnData) {
        console.error(`[XTB Backend] Failed to get data for ${symbol}`);
        continue;
      }

      rates.push({
        symbol,
        bid: symbolResponse.returnData.bid,
        ask: symbolResponse.returnData.ask,
        timestamp: symbolResponse.returnData.time,
        swapLong: Math.abs(symbolResponse.returnData.swapLong),
        swapShort: Math.abs(symbolResponse.returnData.swapShort),
      });
    }

    res.json(rates);
  } catch (error) {
    console.error('[XTB Backend] Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;