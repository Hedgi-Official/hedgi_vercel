// OpenAI API Integration Service
// This service handles communication with OpenAI's API for the Hedgi AI feature

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type OpenAIResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

const HEDGI_AI_SYSTEM_PROMPT = `You are Hedgi AI, an assistant specialized in currency hedging and financial risk management. 
Your purpose is to help users understand how to use currency hedging to protect against exchange rate volatility.
You provide clear, concise, and helpful advice on hedging strategies, timing, and best practices.
Keep responses focused on hedging concepts, practical application, and Hedgi platform features.
When discussing amounts, always format currencies properly (e.g., $10,000, R$5,000, €8,000).
If asked about services outside financial hedging, politely redirect to hedging-related topics.`;

// The OpenAI service class
export class OpenAIService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4o';
  private conversation: Message[] = [];

  constructor() {
    // Initialize the conversation with the system prompt
    this.conversation = [
      { role: 'system', content: HEDGI_AI_SYSTEM_PROMPT }
    ];
    
    // Get the API key from environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  }

  // Add a user message to the conversation
  public async sendMessage(userMessage: string): Promise<string> {
    if (!this.apiKey) {
      console.error('OpenAI API key is not set');
      return 'Sorry, I am unable to respond at the moment due to a configuration issue.';
    }

    // Add user message to conversation history
    this.conversation.push({ role: 'user', content: userMessage });

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.conversation,
          temperature: 0.7,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        return 'Sorry, I encountered an error while processing your request.';
      }

      const data = await response.json() as OpenAIResponse;
      const assistantMessage = data.choices[0].message.content;
      
      // Add assistant's response to conversation history
      this.conversation.push({ role: 'assistant', content: assistantMessage });

      return assistantMessage;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return 'Sorry, I encountered an error while communicating with my knowledge base.';
    }
  }

  // Reset the conversation history
  public resetConversation(): void {
    this.conversation = [
      { role: 'system', content: HEDGI_AI_SYSTEM_PROMPT }
    ];
  }
}

// Export a singleton instance
export const openAIService = new OpenAIService();