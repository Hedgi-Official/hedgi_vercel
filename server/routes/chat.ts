import { Router, Request, Response } from "express";
import { openaiService } from "../services/openai";

const router = Router();

// Message history storage by session ID
// In a production app, this would be stored in a database
const sessionMessages: Record<string, Array<{ role: "user" | "assistant"; content: string }>> = {};

// Endpoint to get a chat response from HedgiBot
router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message, sessionId, language = 'en' } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: "Message is required" 
      });
    }

    // Get or initialize session message history
    const messageHistory = sessionMessages[sessionId] || [];
    
    // Generate a response from OpenAI with language preference
    const botResponse = await openaiService.generateHedgiBotResponse(message, messageHistory, language);
    
    // Update session message history
    if (!sessionMessages[sessionId]) {
      sessionMessages[sessionId] = [];
    }
    
    // Add the user message and bot response to history
    sessionMessages[sessionId].push(
      { role: "user", content: message },
      { role: "assistant", content: botResponse }
    );
    
    // Limit message history to last 10 messages (5 exchanges)
    const maxHistoryLength = 10;
    if (sessionMessages[sessionId].length > maxHistoryLength) {
      sessionMessages[sessionId] = sessionMessages[sessionId].slice(-maxHistoryLength);
    }
    
    return res.json({
      success: true,
      message: botResponse
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing your request"
    });
  }
});

export default router;