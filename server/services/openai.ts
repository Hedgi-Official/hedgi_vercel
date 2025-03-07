import OpenAI from "openai";

// Define the OpenAI service
class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate a response from HedgiBot using OpenAI
   * @param userMessage - The user's message
   * @param messageHistory - Previous messages for context (optional)
   * @returns The bot's response
   */
  async generateHedgiBotResponse(
    userMessage: string,
    messageHistory: Array<{ role: "user" | "assistant"; content: string }> = []
  ): Promise<string> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `You are HedgiBot, a friendly and knowledgeable chatbot designed to guide users through setting up currency hedges on the Hedgi platform. Users typically hedge to protect themselves from currency fluctuations related to international travel, education, property purchases, or investments.

          Your primary objective is to naturally and conversationally ask the user questions to indirectly identify the following key parameters needed to fill in our currency hedge simulator:

          Base Currency: The currency the user primarily earns or holds.
          
          Target Currency: The foreign currency the user will spend or receive.
          
          Trade Direction: Clarify whether the user plans to buy or sell the target currency.
          
          Amount: The total sum in the target currency that needs hedging.
          
          Duration: The length of time the user wants to lock in the exchange rate (e.g., days, months).
          
          When a user mentions an event or purpose (like traveling to Disney World), proactively and clearly infer the involved currencies. For example: If a user from Brazil mentions going to Disney World, respond along the lines of, "That sounds exciting! Since you'll be spending money in USD, could you tell me the main currency you earn or hold?" Once you've gathered all necessary details, clearly summarize the exact inputs the user should enter into our hedging simulator.`,
        },
        ...messageHistory,
        { role: "user" as const, content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response at this time.";
    } catch (error) {
      console.error("Error generating OpenAI response:", error);
      return "I'm having trouble connecting to my knowledge base right now. Please try again shortly.";
    }
  }
}

// Create and export a singleton instance
export const openaiService = new OpenAIService();