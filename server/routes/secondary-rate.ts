import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

const SUPPORTED_PAIRS = ['USDBRL', 'EURUSD', 'USDMXN'];

// Function to generate fallback response with optional error message
const getFallbackResponse = (errorMessage = 'Rate service unavailable') => ({
  bid: 0,
  ask: 0,
  price: 0,
  swap_long: 0,
  swap_short: 0,
  symbol: '',
  error: errorMessage
});

router.get('/api/fbs-rate', async (req, res) => {
  try {
    const symbol = req.query.symbol as string;

    if (!symbol || !SUPPORTED_PAIRS.includes(symbol)) {
      res.status(400).json({ error: 'Invalid or missing symbol parameter' });
      return;
    }

    console.log(`Fetching FBS rate for ${symbol}...`);
    
    try {
      // Use fetch instead of curl for more reliable HTTP requests
      // node-fetch doesn't support timeout in RequestInit, handle with Promise.race
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(
        `http://3.147.6.168/symbol_info?symbol=${symbol}`,
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`FBS rate service returned status ${response.status}`);
        res.json(getFallbackResponse(`Service returned status ${response.status}`));
        return;
      }

      // Check content type to avoid parsing HTML
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Received non-JSON response: ${contentType}`);
        res.json(getFallbackResponse('Invalid response format'));
        return;
      }

      const data = await response.json();
      console.log('FBS rate data:', data);
      res.json(data);
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      res.json(getFallbackResponse('Connection error'));
    }
  } catch (error) {
    console.error('Error in FBS rate endpoint:', error);
    res.json(getFallbackResponse('Internal server error'));
  }
});


export default router;