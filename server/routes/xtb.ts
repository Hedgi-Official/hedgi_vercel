import { Router } from 'express';
import WebSocket from 'ws';
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

// Assuming XTB_SERVER_URL is defined elsewhere, e.g., in a configuration file
const XTB_SERVER_URL = 'http://127.0.0.1:5000'; // Replace with your actual URL

router.post('/api/xtb/hedge', async (req, res) => {
  try {
    console.log('[XTB Backend] Forwarding hedge request to Flask server:', req.body);

    // Construct trade transaction in correct format
    const { symbol, volume, isBuy, customComment } = req.body;

    const tradeTransInfo = {
      cmd: isBuy ? 0 : 1,
      symbol,
      volume,
      price: 0,  // Market price
      offset: 0,
      order: 0   // New order
    };

    if (customComment) {
      tradeTransInfo.customComment = customComment;
    }

    const response = await fetch(`${XTB_SERVER_URL}/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commandName: "tradeTransaction",
        arguments: {
          tradeTransInfo
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Trade failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[XTB Backend] Trade response:', data);

    res.json(data);
  } catch (error) {
    console.error('[XTB Backend] Error executing hedge via Flask server:', error);
    res.status(500).json({ error: error.message });
  }
});

// Keep existing routes but add fallback functionality
router.get('/api/xtb/rates', async (req, res) => {
  // Explicitly set the content type as JSON and ensure we bypass Vite's HMR handling
  res.setHeader('Content-Type', 'application/json');
  res.removeHeader('X-Powered-By'); // Remove any Express headers
  try {
    const response = await fetch(`${XTB_SERVER_URL}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandName: "getSymbol",
        arguments: {
          symbol: req.query.symbol || 'USDBRL'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch rates with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[XTB Backend] Rates response:', data);

    if (!data.status) {
      throw new Error(data.errorDescr || 'Failed to fetch rates');
    }

    res.json(data);
  } catch (error) {
    console.error('[XTB Backend] Error fetching rates:', error);
    // Return fallback data instead of an error
    res.json(FALLBACK_RATES.map(rate => ({
      ...rate,
      timestamp: Date.now() // Update timestamp
    })));
  }
});

router.get('/api/xtb/status/:orderId', async (req, res) => {
  try {
    const response = await fetch(`${XTB_SERVER_URL}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandName: "getTrades",
        arguments: {
          openedOnly: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch trade status with status ${response.status}`);
    }

    const data = await response.json();
    console.log('[XTB Backend] Trade status response:', data);

    if (!data.status) {
      throw new Error(data.errorDescr || 'Failed to fetch trade status');
    }

    res.json(data);
  } catch (error) {
    console.error('[XTB Backend] Error fetching trade status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize XTB connection with backend credentials
const initializeXTB = async () => {
  try {
    // Update server URL for demo
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

export default router;