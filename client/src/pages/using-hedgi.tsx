import { useState } from "react";
import { Header } from "@/components/header";
import { EnhancedCurrencySimulator } from "@/components/enhanced-currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, DollarSign, Send, Clock, TrendingUp, BarChart2, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function UsingHedgi() {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'bot', content: string}>>([
    {type: 'bot', content: 'Hello! I\'m Hedgi AI Assistant. I can help you understand how to set up and manage currency hedges. What would you like to know about?'}
  ]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // Add user message
    setChatMessages(prev => [...prev, {type: 'user', content: message}]);
    
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: 'This is a UI demonstration only. The actual AI integration will be implemented later. How else can I help you understand hedging?'
        }
      ]);
    }, 1000);
    
    setMessage("");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header showAuthButton />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6 text-center">Using Hedgi</h1>
          
          <p className="text-center text-muted-foreground mb-10 max-w-3xl mx-auto">
            Hedgi offers two intuitive tools to help you effortlessly manage currency risks. 
            Use our simulator for direct interaction or chat with our AI assistant for guided help.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Hedgi AI Chatbot */}
            <div className="order-2 lg:order-1">
              <Card className="h-full shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Hedgi AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[600px] flex flex-col">
                  <ScrollArea className="flex-1 pr-4 mb-4">
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
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex items-center mt-auto">
                    <Input
                      placeholder="Ask about currency hedging..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      className="ml-2"
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Enhanced Currency Simulator with better tooltips */}
            <div className="order-1 lg:order-2">
              <div className="enhanced-tooltips">
                <EnhancedCurrencySimulator showGraph={true} />
              </div>
            </div>
          </div>
          
          
        </main>
      </div>
    </TooltipProvider>
  );
}
