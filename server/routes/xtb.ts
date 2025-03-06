import { Router } from 'express';
import { tradingService } from '../services/trading';

const router = Router();

// Fallback data for when XTB API is unavailable
const FALLBACK_RATES = [
  {
    symbol: 'USDBRL',
    bid: 5.67,
    ask: 5.69,
    timestamp: Date.now(),
    swapLong: 0.0002,
    swapShort: 0.0001,
  },
  {
    symbol: 'EURUSD',
    bid: 1.08,
    ask: 1.09,
    timestamp: Date.now(),
    swapLong: 0.0001,
    swapShort: 0.0002,
  },
  {
    symbol: 'USDMXN',
    bid: 16.75,
    ask: 16.78,
    timestamp: Date.now(),
    swapLong: 0.0001,
    swapShort: 0.0001,
  }
];

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

router.post('/api/xtb/hedge', async (req, res) => {
  try {
    console.log('[XTB Backend] Processing hedge request from /api/hedges', {
      body: req.body,
      headers: req.headers,
      url: req.url
    });

    await tradingService.connect();

    const { amount, baseCurrency, targetCurrency, tradeDirection } = req.body;

    // Calculate volume in lots (1 lot = 100,000 units)
    // Handle both positive and negative amounts
    const volume = Math.abs(Number(amount)) / 100000;

    // Format symbol correctly (e.g., EURUSD)
    const symbol = `${targetCurrency}${baseCurrency}`;

    console.log('[XTB Backend] Prepared trade parameters:', {
      symbol,
      volume,
      tradeDirection,
      originalAmount: amount
    });

    // Execute the trade using the exact format from example
    const tradeResult = await tradingService.openTrade(
      symbol,
      volume,
      tradeDirection === 'buy'
    );

    console.log('[XTB Backend] Trade execution result:', {
      tradeResult,
      symbol,
      volume
    });

    res.json({
      status: true,
      tradeOrderNumber: tradeResult
    });
  } catch (error) {
    console.error('[XTB Backend] Error executing hedge:', error);
    res.status(500).json({ 
      status: false, 
      error: error instanceof Error ? error.message : 'Failed to execute hedge' 
    });
  }
});

router.get('/api/xtb/trades/:tradeNumber', async (req, res) => {
  try {
    await tradingService.connect();

    const tradeNumber = Number(req.params.tradeNumber);
    const status = await tradingService.checkTradeStatus(tradeNumber);

    console.log('[Routes] Trade status response for order', tradeNumber, ':', status);

    res.json(status);
  } catch (error) {
    console.error('[XTB Backend] Error checking trade status:', error);
    res.status(500).json({ 
      status: false, 
      error: error instanceof Error ? error.message : 'Failed to check trade status' 
    });
  }
});

router.post('/api/xtb/trades/:tradeNumber/close', async (req, res) => {
  try {
    const { symbol, volume, tradeDirection } = req.body;
    
    if (!symbol || volume === undefined) {
      return res.status(400).json({
        status: false,
        error: 'Missing required parameters: symbol and volume are required'
      });
    }
    
    const tradeNumber = Number(req.params.tradeNumber);
    if (isNaN(tradeNumber) || tradeNumber <= 0) {
      return res.status(400).json({
        status: false,
        error: 'Invalid trade number'
      });
    }
    
    console.log(`[XTB Backend] Closing trade ${tradeNumber} for ${symbol}, volume ${volume}, direction ${tradeDirection}`);
    
    const connected = await tradingService.connect();
    if (!connected) {
      return res.status(500).json({
        status: false,
        error: 'Failed to connect to trading service'
      });
    }

    const closeResponse = await tradingService.closeTrade(
      symbol,
      tradeNumber,
      volume,
      tradeDirection === 'buy',
      `Closing hedge trade ${tradeNumber} for ${symbol}`
    );

    // Return the actual closing response
    res.json(closeResponse);
  } catch (error) {
    console.error('[XTB Backend] Error closing trade:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      status: false, 
      error: error instanceof Error ? error.message : 'Failed to close trade' 
    });
  }
});

// Keep existing routes but add fallback functionality
router.get('/api/xtb/rates', async (req, res) => {
  // Explicitly set the content type as JSON and ensure we bypass Vite's HMR handling
  res.setHeader('Content-Type', 'application/json');
  res.removeHeader('X-Powered-By'); // Remove any Express headers
  try {
    let isConnected = false;
    if (!tradingService.isConnected) {
      isConnected = await initializeXTB();
      if (!isConnected) {
        console.log('[XTB Backend] Using fallback rates as XTB service is unavailable');
        // Return fallback data with updated timestamp
        return res.json(FALLBACK_RATES.map(rate => ({
          ...rate,
          timestamp: Date.now() // Update timestamp to current time
        })));
      }
    } else {
      isConnected = true;
    }

    // If we're here, we're connected (or think we are)
    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      try {
        const symbolResponse = await tradingService.getSymbolData(symbol);

        if (!symbolResponse.status || !symbolResponse.returnData) {
          console.log(`[XTB Backend] Failed to get data for ${symbol}, using fallback`);
          // Add fallback data for this specific symbol
          const fallback = FALLBACK_RATES.find(r => r.symbol === symbol);
          if (fallback) {
            rates.push({
              ...fallback,
              timestamp: Date.now() // Update timestamp
            });
          }
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
      } catch (error) {
        console.error(`[XTB Backend] Error processing ${symbol}:`, error);
        // Add fallback data for this symbol when there's an error
        const fallback = FALLBACK_RATES.find(r => r.symbol === symbol);
        if (fallback) {
          rates.push({
            ...fallback,
            timestamp: Date.now() // Update timestamp
          });
        }
      }
    }

    // If we couldn't get any rates, use all fallbacks
    if (rates.length === 0) {
      console.log('[XTB Backend] No rates available, using all fallbacks');
      return res.json(FALLBACK_RATES.map(rate => ({
        ...rate,
        timestamp: Date.now() // Update timestamp
      })));
    }

    res.json(rates);
  } catch (error) {
    console.error('[XTB Backend] Error fetching rates:', error);
    // Return fallback data instead of an error
    res.json(FALLBACK_RATES.map(rate => ({
      ...rate,
      timestamp: Date.now() // Update timestamp
    })));
  }
});

export default router;