import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

router.get('/api/fbs-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`Executing curl command for FBS rate for ${symbol}...`);
    const { stdout, stderr } = await execAsync(
      `curl -s -H "skip_zrok_interstitial: true" "https://5pxoe9wu00tf.share.zrok.io/symbol_info?symbol=${symbol}"`
    );

    if (stderr) {
      console.error('Curl command error:', stderr);
      res.status(500).json({ error: 'Failed to fetch FBS rate' });
      return;
    }

    try {
      const data = JSON.parse(stdout);
      console.log('FBS rate data:', data);
      res.json(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw output:', stdout);
      res.status(500).json({ error: 'Invalid response format from FBS rate service' });
    }
  } catch (error) {
    console.error('Error fetching FBS rate:', error);
    res.status(500).json({ error: 'Failed to fetch FBS rate' });
  }
});

export default router;