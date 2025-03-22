import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/activtrades-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`Executing curl command for ActiveTrades rate for ${symbol}...`);
    const { stdout, stderr } = await execAsync(
      `curl -s "http://3.145.164.47/symbol_info?broker=activtrades&symbol=${symbol}"`
    );

    if (stderr) {
      console.error('Curl command error:', stderr);
      res.status(500).json({ error: 'Failed to fetch ActiveTrades rate' });
      return;
    }

    // Check if the response is HTML (which would indicate an error, e.g. due to an expired API key)
    if (stdout.trim().startsWith('<!DOCTYPE')) {
      console.warn('Received HTML instead of JSON. Returning fallback response.');
      res.json({
        bid: 0,
        ask: 0,
        price: 0,
        error: 'ActiveTrades rate API unavailable'
      });
      return;
    }

    try {
      const data = JSON.parse(stdout);
      console.log('ActiveTrades rate data:', data);
      res.json(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw output:', stdout);
      res.status(500).json({ error: 'Invalid response format from ActiveTrades rate service' });
    }
  } catch (error) {
    console.error('Error fetching ActiveTrades rate:', error);
    res.status(500).json({ error: 'Failed to fetch ActiveTrades rate' });
  }
});


export default router;