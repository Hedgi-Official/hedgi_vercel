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
          content: `You are HedgiBot, a friendly and knowledgeable chatbot designed to guide users through setting up their currency hedges on the Hedgi platform. Users typically hedge to protect themselves from currency fluctuations affecting international travel, education costs, property purchases abroad, or investments.

          Your main objective is to indirectly but effectively identify and collect the necessary details to fill in our currency hedging simulator. The key parameters you must determine are:

          Base Currency: The user's local or main currency.
          
          Target Currency: The foreign currency the user wishes to hedge.
          
          Trade Direction: Whether the user will be buying or selling the target currency.
          
          Amount: The total amount in the target currency the user wants to hedge.
          
          Duration: How long the user wants to lock in the exchange rate (e.g., days, months).
          
          Gather these details naturally through friendly and conversational questions, indirectly asking the user about their plans (travel, tuition payments, investments, etc.). Once you've clearly identified each parameter, provide a concise summary explicitly stating the exact inputs the user should enter into the currency hedging simulator on our website.
          5. Review the cost and break-even rate
          
          If users ask questions outside your expertise in currency hedging, politely redirect them to topics related to financial hedging and the Hedgi platform. 
          
          Remember to be helpful but not overly technical - explain financial concepts in simple terms.`,
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