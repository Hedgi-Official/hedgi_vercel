import { Router } from 'express';
import { tradingService } from '../services/trading';

const router = Router();

// Initialize XTB connection with backend credentials
const initializeXTB = async () => {
  try {
    // Initialize connection to the Flask server
    await tradingService.connect();
    console.log('[XTB Backend] Connected successfully to Flask server');
    return true;
  } catch (error) {
    console.error('[XTB Backend] Connection error:', error);
    return false;
  }
};

// Initialize connection when the server starts
initializeXTB().catch(err => {
  console.error('[XTB Backend] Initial connection failed:', err);
});

router.post('/api/xtb/hedge', async (req, res) => {
  try {
    // Always ensure we're connected before operations
    if (!tradingService.isConnected) {
      const connected = await initializeXTB();
      if (!connected) {
        return res.status(503).json({ 
          error: 'XTB trading service is unavailable. Please try again later.'
        });
      }
    }

    const hedgeResult = await tradingService.executeHedge(req.body);
    res.json(hedgeResult);
  } catch (error: any) {
    console.error('[XTB Backend] Error executing hedge:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to execute hedge' 
    });
  }
});

// Fetch exchange rates from Flask server
router.get('/api/xtb/rates', async (req, res) => {
  try {
    // Always ensure we're connected before operations
    if (!tradingService.isConnected) {
      const connected = await initializeXTB();
      if (!connected) {
        return res.status(503).json({ 
          error: 'XTB trading service is unavailable. Please try again later.'
        });
      }
    }

    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      try {
        console.log(`[XTB Backend] Fetching data for ${symbol}`);
        const symbolResponse = await tradingService.getSymbolData(symbol);

        if (!symbolResponse.status || !symbolResponse.returnData) {
          console.error(`[XTB Backend] Failed to get data for ${symbol}:`, symbolResponse);
          continue;
        }

        rates.push({
          symbol,
          bid: symbolResponse.returnData.bid,
          ask: symbolResponse.returnData.ask,
          timestamp: symbolResponse.returnData.time || Date.now(),
          swapLong: Math.abs(symbolResponse.returnData.swapLong || 0),
          swapShort: Math.abs(symbolResponse.returnData.swapShort || 0),
        });
      } catch (symbolError) {
        console.error(`[XTB Backend] Error processing ${symbol}:`, symbolError);
        // Continue with other symbols even if one fails
      }
    }

    if (rates.length === 0) {
      console.error('[XTB Backend] No exchange rates data available');
      return res.status(503).json({ 
        error: 'No exchange rates data available from XTB server' 
      });
    }

    res.json(rates);
  } catch (error: any) {
    console.error('[XTB Backend] Error fetching rates:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch exchange rates' 
    });
  }
});

export default router;