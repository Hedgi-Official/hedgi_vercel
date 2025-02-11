import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

router.get('/api/secondary-rate', async (req, res) => {
  try {
    console.log('Executing curl command for secondary rate...');
    // Add -v flag for verbose output to help debug the request
    const { stdout, stderr } = await execAsync(
      'curl -v -s -H "skip_zrok_interstitial: true" "https://5pxoe9wu00tf.share.zrok.io/symbol_info?symbol=USDBRL"'
    );

    if (stderr) {
      console.error('Curl command error:', stderr);
      res.status(500).json({ error: 'Failed to fetch secondary rate' });
      return;
    }

    // Try to parse the response as JSON
    try {
      const data = JSON.parse(stdout);
      console.log('Secondary rate data:', data);
      res.json(data);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw output:', stdout);
      res.status(500).json({ error: 'Invalid response format from secondary rate service' });
    }
  } catch (error) {
    console.error('Error fetching secondary rate:', error);
    res.status(500).json({ error: 'Failed to fetch secondary rate' });
  }
});

export default router;