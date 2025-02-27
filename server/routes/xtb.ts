import { Router } from 'express';
import WebSocket from 'ws';
import { XTBService } from '../../shared/services/xtb-service';

const router = Router();

class BackendXTBService extends XTBService {
  // Override WebSocket creation to use 'ws' package
  protected createWebSocket(url: string): WebSocket {
    return new WebSocket(url);
  }
}

const xtbService = new BackendXTBService();

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
    if (!xtbService.getConnectionStatus()) {
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

export default router;