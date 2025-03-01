import { Router } from 'express';
import { xtbService } from '../services/trading';

const router = Router();

// Initialize XTB connection with backend credentials
const initializeXTB = async () => {
  try {
    // Use environment variables for credentials
    await xtbService.connect({
      userId: process.env.XTB_USER_ID!,
      password: process.env.XTB_PASSWORD!,
    });
    console.log('[XTB Backend] Connected successfully');
    return true;
  } catch (error) {
    console.error('[XTB Backend] Connection error:', error);
    return false;
  }
};

// Initialize connection when the server starts
initializeXTB();

router.get('/api/xtb/rates', async (req, res) => {
  try {
    if (!xtbService.isConnected) {
      await initializeXTB();
    }

    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      const symbolResponse = await xtbService.getSymbolData(symbol);

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

// Forward trade requests to Python bridge with enhanced debugging
router.post('/api/xtb/trade', async (req, res) => {
  try {
    // Log the incoming request
    console.log('[XTB Backend] Trade request received:', req.body);

    // Try to get bridge status first
    const statusResponse = await fetch('http://localhost:8003/ping'); // Port changed to 8003
    const bridgeStatus = await statusResponse.json();
    console.log('[XTB Backend] Bridge status:', bridgeStatus);

    if (!bridgeStatus.ready) {
      console.error('[XTB Backend] Bridge not ready:', bridgeStatus);
      return res.status(503).json({
        error: 'Trading bridge not ready',
        status: bridgeStatus
      });
    }

    // Forward the request to Python bridge
    const response = await fetch('http://localhost:8003/trade', { // Port changed to 8003
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('[XTB Backend] Trade response:', data);

    // Return both the trading result and debug info
    res.json({
      ...data,
      bridgeStatus
    });
  } catch (error) {
    console.error('[XTB Backend] Error forwarding trade request:', error);
    res.status(500).json({ 
      error: 'Failed to process trade request',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Debug endpoint to test bridge connection
router.get('/api/xtb/debug', async (req, res) => {
  try {
    const response = await fetch('http://localhost:8002/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });

    const debugInfo = await response.json();
    res.json({
      expressStatus: 'ok',
      bridgeInfo: debugInfo,
      env: {
        bridgePort: process.env.XTB_BRIDGE_PORT,
        hasUserId: !!process.env.XTB_USER_ID,
        hasPassword: !!process.env.XTB_PASSWORD
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get debug info',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;