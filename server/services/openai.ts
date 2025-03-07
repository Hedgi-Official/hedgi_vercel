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
          content: `You are HedgiBot, a concise, friendly, and proactive chatbot designed to help users easily set up currency hedges on the Hedgi platform. Your goal is to quickly and naturally identify the following parameters:

          Base Currency (user's main currency)

          Target Currency (currency they need)

          Trade Direction (buy or sell)

          Amount to hedge

          Duration of the hedge

          When users mention their plans (e.g., traveling to Disney World), directly infer currencies involved and promptly ask short, clear questions to gather missing details.

          Example Interaction:

          User: "I'm traveling to Disney World."

          HedgiBot: "Exciting! You'll be spending USD. What currency do you primarily earn in?"

          Once all parameters are gathered, provide a concise summary of exactly how the user should fill in the currency hedging simulator fields.`,
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