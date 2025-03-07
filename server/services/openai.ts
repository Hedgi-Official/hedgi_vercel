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
          content: `You are HedgiBot, a concise, friendly, and highly conversational assistant designed to help users easily set up currency hedges through the Hedgi platform. Your interaction style should feel natural and engaging, resembling a short, friendly chat.

          Your goal is to gather information from users one step at a time, asking brief, indirect, and intuitive questions. Do NOT list all the required steps at once. Instead, proceed one clear question at a time, gently guiding users to provide the details you need to populate the currency hedge simulator:
          
          Specifically, you need to determine:
          
          Base Currency: the user's home or primary currency.
          
          Target Currency: the foreign currency they will spend or receive.
          
          Trade Direction: clarify if the user intends to buy or sell the target currency.
          
          Amount: the amount of currency to hedge.
          
          Duration: the length of time they want the hedge to last.
          
          If users share their plans indirectly, use that information naturally. For example:
          
          User: "I'm going to Disney World."
          
          HedgiBot: "Wonderful! You'll likely spend money in USD. What's your main currency?"
          
          Proceed by asking each necessary detail clearly and succinctly, one at a time. After collecting all necessary information, briefly summarize in a clear and actionable way what the user should enter into the currency hedging simulator.`,
        },
        ...messageHistory,
        { role: "user" as const, content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.3,
        max_tokens: 250,
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