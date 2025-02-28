import { Router } from 'express';
import WebSocket from 'ws';
import { XTBService } from '../../client/src/lib/xtb-service';

const router = Router();

class BackendXTBService extends XTBService {
  // Override WebSocket creation to use 'ws' package
  protected createWebSocket(url: string): WebSocket {
    return new WebSocket(url);
  }
}

const xtbService = new BackendXTBService();

// Update server URL for demo
xtbService.serverUrl = 'wss://ws.xtb.com/demo';
xtbService.streamUrl = 'wss://ws.xtb.com/demoStream';

router.get('/api/xtb/rates', async (req, res) => {
  try {
    if (!xtbService.isConnected) {
      try {
        await xtbService.connect({
          userId: process.env.XTB_USER_ID!,
          password: process.env.XTB_PASSWORD!,
        });
      } catch (error) {
        console.error('[XTB Backend] Connection error:', error);
        res.status(503).json({ error: 'XTB service temporarily unavailable' });
        return;
      }
    }

    const symbols = ['USDBRL', 'EURUSD', 'USDMXN'];
    const rates = [];

    for (const symbol of symbols) {
      try {
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
      } catch (error) {
        console.error(`[XTB Backend] Error fetching ${symbol}:`, error);
      }
    }

    if (rates.length === 0) {
      res.status(503).json({ error: 'Unable to fetch any rates' });
      return;
    }

    res.json(rates);
  } catch (error) {
    console.error('[XTB Backend] Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

export default router;