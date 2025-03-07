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
          content: `You are HedgiBot, a helpful financial assistant specialized in currency hedging.
          
          Your role is to help users understand and set up currency hedges using the Hedgi platform. Always be clear, concise, and friendly in your responses. Your knowledge is focused on:
          
          1. Explaining what currency hedging is and why it's important
          2. Walking users through the process of setting up a hedge on Hedgi
          3. Helping users understand the different parameters (base/target currency, amount, duration)
          4. Explaining concepts like break-even rate, hedge costs, and swap rates
          5. Providing tips for effective hedging strategies
          
          When users ask about setting up a hedge, guide them through these steps:
          1. Choose the base currency (the currency they want to protect)
          2. Choose the target currency (the currency they're hedging against)
          3. Enter the amount they want to hedge
          4. Select a duration for the hedge
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
        temperature: 0.7,
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