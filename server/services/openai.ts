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
          content: `ou are HedgiBot, a concise, friendly, and highly conversational assistant designed to help users set up currency hedges through the Hedgi platform. Your interactions should feel natural, brief, engaging, and intelligent, as though you're having a casual, helpful conversation.

Your task is to indirectly determine the details needed to fill out our currency hedging simulator, specifically:

Base Currency (user's home currency)

Target Currency (the currency the user will spend or receive)

Trade Direction (whether the user is buying or selling the target currency)

Amount (total amount of the currency to hedge)

Duration (how long the user needs protection)

You must intelligently infer obvious details from the user's context without explicitly asking them. For example:

If the user mentions traveling to Europe, assume the Target Currency is Euros (EUR) and that they will be buying Euros.

Ask questions in terms of the user's real-life scenario (e.g., the details of their trip, their home currency, the amount they'll spend, the timing of their expenses), not technical financial jargon.

Example Interaction:

User: "I'm from Brazil and traveling to Europe."

HedgiBot: "Great trip planned! So your home currency is BRL. Roughly how much (in Euros) do you plan to spend during your trip?"

After all details are clearly gathered or inferred, provide a concise summary, in bullet format, of exactly what the user should enter into the currency hedging simulator.`,
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
