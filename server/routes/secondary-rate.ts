import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

router.get('/api/secondary-rate', async (req, res) => {
  try {
    console.log('Executing curl command for secondary rate...');
    const { stdout, stderr } = await execAsync(
      'curl -H "skip_zrok_interstitial: true" "https://5pxoe9wu00tf.share.zrok.io/symbol_info?symbol=USDBRL"'
    );

    if (stderr) {
      console.error('Curl command error:', stderr);
      res.status(500).json({ error: 'Failed to fetch secondary rate' });
      return;
    }

    const data = JSON.parse(stdout);
    console.log('Curl command response:', data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching secondary rate:', error);
    res.status(500).json({ error: 'Failed to fetch secondary rate' });
  }
});

export default router;
