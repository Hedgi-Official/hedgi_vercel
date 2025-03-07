import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

// The OpenAI API endpoint for chat completions
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get the OpenAI API key from the environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

router.post('/chat', async (req: Request, res: Response) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API key not configured' 
    });
  }

  try {
    // Extract messages from the request body
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ 
        error: 'Messages must be provided and must be an array' 
      });
    }

    // Make the request to OpenAI
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Error communicating with OpenAI API',
        details: errorData
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in OpenAI chat endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to process your request'
    });
  }
});

export default router;