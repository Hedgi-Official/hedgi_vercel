import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { EnhancedCurrencySimulator } from "@/components/enhanced-currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, DollarSign, Send, Clock, TrendingUp, BarChart2, MessageCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

// Generate a unique session ID for this chat session
const generateSessionId = () => {
  return `hedgi-chat-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export default function UsingHedgi() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<HTMLDivElement>(null);
  const chatCardRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(700); // Start with a reasonable default height
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'bot', content: string}>>([
    {type: 'bot', content: 'Hello! I\'m HedgiBot. I can help you understand how to set up and manage currency hedges. For what event would you like to hedge?'}
  ]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Add user message
    setChatMessages(prev => [...prev, {type: 'user', content: message}]);

    // Store current message and clear input
    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
      // Call the API with English language parameter
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          sessionId: sessionId,
          language: 'en-US'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to get a response from HedgiBot');
      }

      // Add bot response
      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: data.message
        }
      ]);
    } catch (error) {
      console.error('Error calling chat API:', error);

      // Show error toast
      toast({
        title: "Chat Error",
        description: "Sorry, I couldn't connect to my knowledge base. Please try again.",
        variant: "destructive",
      });

      // Add error message to chat
      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: "I'm having trouble connecting to my knowledge base right now. Please try again shortly."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial bot greeting
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        type: 'bot',
        content: "Hi there! I'm HedgiBot. How can I help you set up currency protection today?"
      }]);
    }
  }, [chatMessages]);
  
  // Effect to measure initial height of the simulator without the expanded content
  useEffect(() => {
    // Only proceed if both refs are valid
    if (!simulatorRef.current || !chatCardRef.current) return;
    
    // Delay slightly to ensure the components are fully rendered
    const timer = setTimeout(() => {
      if (!simulatorRef.current) return;
      
      // Initial height measurement - get the simulator card
      const simulatorCard = simulatorRef.current!.querySelector('.card-container');
      if (simulatorCard) {
        const initialHeight = simulatorCard.getBoundingClientRect().height;
        if (initialHeight > 100) {
          setContainerHeight(initialHeight);
        }
      }
    }, 300); // Slightly longer delay to ensure full rendering
    
    return () => clearTimeout(timer);
  }, []);
  
  // Effect to synchronize heights between simulator and chat during interaction
  useEffect(() => {
    // Function to measure and update heights
    const updateHeights = () => {
      // Only proceed if we have refs to both components
      if (simulatorRef.current && chatCardRef.current) {
        // Get the current height of simulator including any expanded content
        const simulatorHeight = simulatorRef.current.getBoundingClientRect().height;
        
        // Update state if height is valid and different from current
        if (simulatorHeight > 100 && simulatorHeight !== containerHeight) {
          // Set the new height
          setContainerHeight(simulatorHeight);
        }
      }
    };
    
    // Setup resize observer for continuous monitoring
    const resizeObserver = new ResizeObserver(updateHeights);
    
    // Observe the simulator container for changes
    if (simulatorRef.current) {
      resizeObserver.observe(simulatorRef.current);
    }
    
    // Cleanup function
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerHeight]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="page-container bg-background">
        <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

        <main className="page-main container mx-auto px-4 page-section">
          <h1 className="text-3xl font-bold mb-6 text-center">Using Hedgi</h1>

          <p className="text-justify text-muted-foreground mb-10 max-w-3xl mx-auto">
            Hedgi offers two intuitive tools to help you learn to effortlessly manage currency risks. 
            Use our simulator for direct interaction or chat with our AI assistant for guided help.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Hedgi AI Chatbot */}
            <div className="order-2 lg:order-1">
              <Card 
                ref={chatCardRef}
                className="h-full shadow-lg flex flex-col"
                style={{ height: `${containerHeight}px` }}
              >
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Hedgi AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow chat-content p-4 pb-6 overflow-hidden">
                  {/* Message container with fixed height and scrolling */}
                  <div className="flex-1 overflow-hidden flex flex-col mb-4">
                    <ScrollArea ref={scrollAreaRef} className="w-full h-full flex-1 pr-4" type="always">
                      <div className="space-y-4">
                        {chatMessages.map((msg, i) => (
                          <div 
                            key={i}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                                msg.type === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.type === 'bot' ? (
                                <div className="markdown-content whitespace-pre-line">
                                  {msg.content.split('**').map((part, i) => 
                                    i % 2 === 0 ? (
                                      <span key={i}>{part}</span>
                                    ) : (
                                      <strong key={i}>{part}</strong>
                                    )
                                  )}
                                </div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="rounded-lg px-4 py-2 bg-muted flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Thinking...</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Input area fixed to bottom */}
                  <div className="flex items-center mt-4 flex-shrink-0">
                    <Input
                      placeholder="Ask about currency hedging..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      className="ml-2"
                      size="icon"
                      disabled={isLoading || !message.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Currency Simulator with better tooltips */}
            <div className="order-1 lg:order-2">
              <div className="enhanced-tooltips" ref={simulatorRef}>
                <EnhancedCurrencySimulator showGraph={false} />
              </div>
            </div>
          </div>


        </main>
      </div>
    </TooltipProvider>
  );
}