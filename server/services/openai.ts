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
    language: string = 'en',
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

Only after all details are clearly gathered, provide a concise summary, in bullet format, of exactly what the user should enter into the currency hedging simulator.

Be sure to provide the summary first. In a separate response, if the target and Base currencies include one that is not USD or BRL, or if the required date is more than 30 days away, or if the amount is over 10,000 USD or not a multiple of $1000, apologize and say:

 "We are currently working on supporting your specific hedge, but due to the current limitations of our testing phase, we only support USD transactions in multiples of $1000, up to $10,000, and durations up to 30 days."

You can adjust the apology message based on the specific Hedge that was requested.

Example Interaction:

User: "I'm traveling to Europe."

HedgiBot: "Great! You'll be spending Euros. What's your estimated total spending in Euros for the trip?"

User: "About 200 Euros."

HedgiBot: "Got it. When does your trip begin?"

User: "In 2 Months."

HedgiBot: "And what is your home currency?"

User: "I am from Brazil."

HedgiBot: "Thank you for sharing that! So, to summarize, you're looking to hedge:

- Base Currency: BRL
- Target Currency: EUR
- Trade Direction: Buy
- Amount: 200 EUR
- Date: In 60 days

I'm sorry, but we are currently working on supporting your specific hedge. Due to the current limitations of our testing phase, we only support USD transactions in multiples of $1000, up to $10,000, and durations up to 30 days.
`,
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

  /**
   * Generate a response for business simulation chat that returns structured JSON
   * @param userMessage - The user's message
   * @param messageHistory - Previous messages for context (optional)
   * @returns Object with bot response and optional parsed form fields
   */
  async generateBusinessSimulateResponse(
    userMessage: string,
    messageHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
  ): Promise<{
    message: string;
    formData?: {
      symbol?: string;
      direction?: string;
      volume?: number;
      duration_days?: number;
    };
    complete: boolean;
  }> {
    try {
      const messages = [
        {
          role: "system" as const,
          content: `You are a helpful assistant for Hedgi's corporate trading platform. Your role is to help business users set up currency hedge simulations by gathering the following information through natural conversation:

1. **Symbol** (currency pair): Must be one of USDBRL, EURUSD, or USDMXN
2. **Direction**: Either "buy" (long) or "sell" (short)
3. **Volume**: Amount in lots (e.g., 0.1, 0.5, 1.0, 5.0). 1 lot = 100,000 units of base currency
4. **Duration**: Number of days for the hedge (1-365 days)

IMPORTANT RULES:
- Be conversational but efficient. Business users appreciate directness.
- If the user mentions a dollar amount, help them convert to lots (1 lot = $100,000)
- When you have gathered ALL four pieces of information, include a JSON block in your response

When all information is gathered, end your response with this exact format:
\`\`\`json
{"symbol": "USDBRL", "direction": "buy", "volume": 0.5, "duration_days": 14, "complete": true}
\`\`\`

If information is still missing, respond naturally without the JSON block.

Example interaction:
User: "I need to hedge 50,000 USD against BRL for two weeks"
Assistant: "I can help with that USD/BRL hedge. You want to protect $50,000 for 14 days. Are you looking to buy USD (protect against BRL weakening) or sell USD (protect against BRL strengthening)?

User: "Buy USD"
Assistant: "Perfect! I'll set up a simulation for you to buy 0.5 lots of USD/BRL (representing $50,000) for 14 days.

\`\`\`json
{"symbol": "USDBRL", "direction": "buy", "volume": 0.5, "duration_days": 14, "complete": true}
\`\`\`"`,
        },
        ...messageHistory,
        { role: "user" as const, content: userMessage },
      ];

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 500,
      });

      const responseContent =
        completion.choices[0].message.content ||
        "I'm sorry, I couldn't generate a response at this time.";

      let formData: {
        symbol?: string;
        direction?: string;
        volume?: number;
        duration_days?: number;
      } | undefined;
      let complete = false;

      const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          if (parsed.complete) {
            formData = {
              symbol: parsed.symbol,
              direction: parsed.direction,
              volume: parsed.volume,
              duration_days: parsed.duration_days,
            };
            complete = true;
          }
        } catch (e) {
          console.error("Failed to parse JSON from OpenAI response:", e);
        }
      }

      const cleanMessage = responseContent.replace(/```json[\s\S]*?```/g, "").trim();

      return {
        message: cleanMessage,
        formData,
        complete,
      };
    } catch (error) {
      console.error("Error generating business simulate response:", error);
      return {
        message: "I'm having trouble connecting right now. Please try again shortly.",
        complete: false,
      };
    }
  }
}

// Create and export a singleton instance
export const openaiService = new OpenAIService();
