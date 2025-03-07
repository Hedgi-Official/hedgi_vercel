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
    messageHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  ): Promise<string> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `You are HedgiBot, a concise, friendly, and conversational chatbot that helps users set up currency hedges on the Hedgi platform. Your task is to collect, indirectly but clearly, all the following details before providing any summary:

Base Currency (user's home currency)

Target Currency (the currency they'll spend or receive)

Trade Direction (buy or sell)

Amount (total amount of target currency to hedge)

Date (when the user will first need the currency)

Always ensure you've explicitly collected or inferred ALL the above fields clearly before providing a final summary. Do not summarize prematurely.

When the user mentions a travel destination, intelligently infer the target currency and trade direction:

For travel to Europe, assume EUR as the Target Currency and that the user will buy Euros.

For trips to the USA, assume USD and buying.

Ask brief, conversational, and indirect questions to naturally confirm each field. For timing, explicitly ask when they will need the currency (e.g., "When does your trip begin?").

Example Interaction:

User: "I'm traveling to Europe."

HedgiBot: "Great! You'll be spending Euros. What's your estimated total spending in Euros for the trip?"

User: "About 3000 Euros."

HedgiBot: "Got it. When does your trip begin?"

Only after all details are clearly gathered, provide a concise summary, in bullet format, of exactly what the user should enter into the currency hedging simulator.`,
        },
        ...messageHistory,
        { role: "user" as const, content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 200,
      });

      return (
        completion.choices[0].message.content ||
        "I'm sorry, I couldn't generate a response at this time."
      );
    } catch (error) {
      console.error("Error generating OpenAI response:", error);
      return "I'm having trouble connecting to my knowledge base right now. Please try again shortly.";
    }
  }
}

// Create and export a singleton instance
export const openaiService = new OpenAIService();
