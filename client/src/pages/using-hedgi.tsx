import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  MessageSquare, 
  Send,
  Info,
  DollarSign,
  Calendar,
  ArrowLeftRight,
  Lightbulb,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Message types for the chatbot
type MessageRole = 'system' | 'user' | 'assistant';

interface Message {
  role: MessageRole;
  content: string;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [input, setInput] = useState("");
  
  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-t">
      <Textarea 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask Hedgi AI how to plan your currency hedge..."
        className="resize-none min-h-[50px]"
      />
      <Button 
        onClick={handleSend} 
        disabled={isLoading || !input.trim()} 
        size="icon"
      >
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
      </Button>
    </div>
  );
}

interface ChatMessageProps {
  message: Message;
}

function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`
          max-w-[80%] px-4 py-2 rounded-lg 
          ${message.role === 'user' 
            ? 'bg-primary text-primary-foreground rounded-tr-none' 
            : 'bg-muted rounded-tl-none'
          }
        `}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

export default function UsingHedgi() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi there! I\'m Hedgi AI, your dedicated currency hedging assistant. How can I help you today?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // System prompt for Hedgi AI
  const systemPrompt: Message = {
    role: 'system',
    content: `You are HedgiBot, a friendly and knowledgeable assistant designed to help users set up currency hedges using Hedgi. Your goal is to:

- Understand user currency hedging needs clearly through friendly questions.
- Collect necessary information: Target currency, Base currency, Amount, Trade Direction (buy or sell), and Duration.
- Provide clear, concise explanations on why and how hedging works.
- Once sufficient information is gathered, summarize clearly what fields the user should input into the currency hedging simulator.

Always ask the user clearly, one at a time, for the following details if not already provided explicitly:
- **Base currency** (currency the user holds or earns in, e.g., Brazilian Reais - BRL)
- **Target currency** (e.g., USD, EUR)
- **Trade direction (buy or sell)** clearly based on the user's goal.
- **Amount** they wish to hedge.
- **Timeframe or duration** of the hedge.
If the user mentions a use case (e.g., vacation, tuition, property), confirm your understanding before proceeding.`
  };

  // Scroll to the bottom of the chat whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Don't allow empty messages or sending while loading
    if (!content.trim() || isLoading) return;

    // Add user message to the chat
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Prepare the messages for the API request, including the system prompt
      const apiMessages = [systemPrompt, ...messages, userMessage];

      // Make the API request to our backend OpenAI endpoint
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get a response from the AI service');
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request at this time.";

      // Add the assistant's response to the chat
      setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('Error in AI chat:', error);
      toast({
        title: "Error",
        description: "There was an error getting a response from the AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header showAuthButton />
      
      {/* Page Introduction */}
      <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">Using Hedgi</h1>
          
          <div className="bg-card rounded-lg p-6 shadow-lg mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Info className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">How to Use This Page</h2>
            </div>
            
            <p className="mb-4">
              This page provides two powerful tools to help you create the perfect currency hedge for your needs:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Currency Hedge Simulator</p>
                  <p className="text-sm text-muted-foreground">
                    Set up and test different hedge scenarios to see potential costs and breakeven rates.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-medium">Hedgi AI Assistant</p>
                  <p className="text-sm text-muted-foreground">
                    Get personalized guidance for your specific hedging needs.
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-sm italic text-muted-foreground">
              <span className="font-medium">Pro Tip:</span> Hover over each section of the simulator for detailed explanations.
            </p>
          </div>
        </div>
      </section>
      
      {/* Main Content Section */}
      <section className="py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Currency Simulator Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Currency Hedge Simulator
              </h2>
              
              <div className="enhanced-simulator-container">
                {/* Target Currency Box */}
                <div className="relative mb-8">
                  <div className="absolute -top-3 left-4 bg-background px-2 z-10">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Currency Selection</span>
                    </div>
                  </div>
                  <div className="border border-primary rounded-lg p-4 hover:border-2 transition-all group">
                    <div className="hidden group-hover:block absolute right-4 top-4 bg-card shadow-lg rounded-lg p-3 max-w-xs z-20">
                      <h3 className="font-medium mb-2 text-primary">Currency Selection</h3>
                      <p className="text-sm">
                        Select the currencies you want to hedge between. The <strong>target currency</strong> is what you want to hedge (e.g., USD), and the <strong>base currency</strong> is what you'll use (e.g., BRL).
                      </p>
                    </div>
                    
                    {/* This div just serves as a container for the simulator's currency selection */}
                    <div className="h-20 opacity-0">Placeholder for currency selection</div>
                  </div>
                </div>
                
                {/* Trade Direction Box */}
                <div className="relative mb-8">
                  <div className="absolute -top-3 left-4 bg-background px-2 z-10">
                    <div className="flex items-center gap-1">
                      <ArrowLeftRight className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Trade Direction</span>
                    </div>
                  </div>
                  <div className="border border-primary rounded-lg p-4 hover:border-2 transition-all group">
                    <div className="hidden group-hover:block absolute right-4 top-4 bg-card shadow-lg rounded-lg p-3 max-w-xs z-20">
                      <h3 className="font-medium mb-2 text-primary">Trade Direction</h3>
                      <p className="text-sm">
                        Choose whether you're <strong>buying</strong> (e.g., planning to spend USD in the future) or <strong>selling</strong> (e.g., expecting to receive USD and convert to BRL).
                      </p>
                    </div>
                    
                    {/* This div just serves as a container for the simulator's trade direction */}
                    <div className="h-20 opacity-0">Placeholder for trade direction</div>
                  </div>
                </div>
                
                {/* Amount Box */}
                <div className="relative mb-8">
                  <div className="absolute -top-3 left-4 bg-background px-2 z-10">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Amount</span>
                    </div>
                  </div>
                  <div className="border border-primary rounded-lg p-4 hover:border-2 transition-all group">
                    <div className="hidden group-hover:block absolute right-4 top-4 bg-card shadow-lg rounded-lg p-3 max-w-xs z-20">
                      <h3 className="font-medium mb-2 text-primary">Amount</h3>
                      <p className="text-sm">
                        Enter the amount of the target currency you want to hedge. This is the actual amount you'll be buying or selling in the future.
                      </p>
                    </div>
                    
                    {/* This div just serves as a container for the simulator's amount field */}
                    <div className="h-20 opacity-0">Placeholder for amount</div>
                  </div>
                </div>
                
                {/* Duration Box */}
                <div className="relative mb-8">
                  <div className="absolute -top-3 left-4 bg-background px-2 z-10">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Duration</span>
                    </div>
                  </div>
                  <div className="border border-primary rounded-lg p-4 hover:border-2 transition-all group">
                    <div className="hidden group-hover:block absolute right-4 top-4 bg-card shadow-lg rounded-lg p-3 max-w-xs z-20">
                      <h3 className="font-medium mb-2 text-primary">Duration</h3>
                      <p className="text-sm">
                        How long do you need the hedge for? Longer durations may affect the cost of your hedge.
                      </p>
                    </div>
                    
                    {/* This div just serves as a container for the simulator's duration slider */}
                    <div className="h-20 opacity-0">Placeholder for duration</div>
                  </div>
                </div>
                
                {/* The actual CurrencySimulator component */}
                <div className="absolute inset-0">
                  <CurrencySimulator showGraph={true} />
                </div>
              </div>
            </div>
            
            {/* Chatbot Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                Hedgi AI Assistant
              </h2>
              
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Chat with Hedgi AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-4 py-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    {messages.map((message, index) => (
                      <ChatMessage key={index} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </CardContent>
                <div className="p-4">
                  <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tips Section */}
      <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Tips for Effective Hedging</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Know Your Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Be clear about why you're hedging. Is it for a specific purchase, trip, or to protect investments? This will help determine the right strategy.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timing Matters</CardTitle>
              </CardHeader>
              <CardContent>
                <p>The best time to hedge is when rates are favorable, not when they're already moving against you. Set up hedges when you have a positive outlook.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Understand Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Every hedge has a cost. Make sure the protection value outweighs this cost by understanding your breakeven rate.</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Duration Strategy</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Longer hedges cost more but provide extended protection. Match the duration to when you actually need the foreign currency.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
