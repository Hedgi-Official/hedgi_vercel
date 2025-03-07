import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/header";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Send, 
  AlertCircle, 
  MessageSquare, 
  ArrowDown, 
  DollarSign, 
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

export default function UsingHedgi() {
  const { t } = useTranslation();
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant", content: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Function to call OpenAI API
  const callOpenAI = async (input: string) => {
    setIsLoading(true);
    setChatHistory((prev) => [...prev, { role: "user", content: input }]);
    setUserInput("");
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...chatHistory, { role: "user", content: input }],
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }
      
      const data = await response.json();
      setChatHistory((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      setChatHistory((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: "I'm sorry, I encountered an error processing your request. Please try again later." 
        }
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      callOpenAI(userInput.trim());
    }
  };

  return (
    <>
      <Header showAuthButton />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">Using Hedgi</h1>
          
          <p className="text-lg md:text-xl text-center mb-8">
            Welcome to Hedgi's tools! Here you can simulate currency hedges and get expert advice from our AI assistant.
            Hover over each feature to learn more about how to use it effectively.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center bg-card rounded-lg p-3 shadow-sm border border-border">
              <HelpCircle className="h-5 w-5 text-primary mr-2" />
              <span>Hover over the simulator inputs for detailed instructions</span>
            </div>
            
            <div className="flex items-center bg-card rounded-lg p-3 shadow-sm border border-border">
              <MessageSquare className="h-5 w-5 text-primary mr-2" />
              <span>Ask Hedgi AI about optimal hedging strategies</span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Simulator Section with Enhanced UI */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Currency Hedge Simulator</h2>
          
          <p className="text-lg text-center mb-12 max-w-3xl mx-auto">
            Our simulator helps you understand how currency hedging can protect your finances.
            Experiment with different scenarios to find the optimal hedging strategy for your needs.
          </p>
          
          <div className="rounded-lg border-2 border-primary/20 p-6 bg-background/50 shadow-lg">
            <TooltipProvider>
              <div className="mb-8">
                <h3 className="text-2xl font-semibold mb-4 flex items-center text-primary">
                  <ShieldCheck className="mr-2 h-6 w-6" />
                  Design Your Hedge
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="border border-primary/30 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                        <h4 className="font-medium mb-2 flex items-center">
                          <DollarSign className="h-5 w-5 text-primary mr-2" />
                          Currency Pair
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Select the currencies you want to hedge between
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4">
                      <h5 className="font-semibold mb-2">Currency Selection</h5>
                      <p>Choose the currency you need to protect (target) and the currency you'll use to pay (base).</p>
                      <p className="mt-2">For example, if you're planning a trip to the US and want to protect your Brazilian Reals from USD appreciation, select USD as target and BRL as base.</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="border border-primary/30 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                        <h4 className="font-medium mb-2 flex items-center">
                          <ArrowRight className="h-5 w-5 text-primary mr-2" />
                          Transaction Direction
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Specify if you're buying or selling the target currency
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4">
                      <h5 className="font-semibold mb-2">Trade Direction</h5>
                      <p>Select "Buy" if you'll need to purchase the target currency in the future (e.g., for travel expenses or tuition).</p>
                      <p className="mt-2">Select "Sell" if you'll receive the target currency and need to convert it to your base currency (e.g., receiving USD payments but need BRL).</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="border border-primary/30 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                        <h4 className="font-medium mb-2 flex items-center">
                          <Clock className="h-5 w-5 text-primary mr-2" />
                          Duration & Amount
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Set the hedge duration and amount to protect
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4">
                      <h5 className="font-semibold mb-2">Time & Value</h5>
                      <p>Duration: How long you need protection for, typically until you need to use the currency.</p>
                      <p className="mt-2">Amount: The total value you want to protect in the target currency.</p>
                      <p className="mt-2">Longer durations generally increase costs but provide protection for a longer period.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <CurrencySimulator showGraph={true} />
              </div>
            </TooltipProvider>
          </div>
        </div>
      </section>
      
      {/* Hedgi AI Chatbot Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-6 text-center flex justify-center items-center">
            <Sparkles className="h-6 w-6 text-primary mr-2" />
            Hedgi AI Assistant
          </h2>
          
          <p className="text-lg text-center mb-8 max-w-3xl mx-auto">
            Not sure how to set up your hedge? Ask our AI assistant for personalized advice on currency hedging strategies
            based on your specific needs and risk tolerance.
          </p>
          
          <Card className="w-full max-w-3xl mx-auto shadow-lg border-primary/20">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-primary" />
                Chat with Hedgi AI
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={chatContainerRef}
                className="h-[400px] overflow-y-auto p-4 space-y-4 bg-background/50"
              >
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 text-primary/30" />
                    <p className="mb-2">Ask Hedgi AI about currency hedging</p>
                    <div className="max-w-sm">
                      <p className="text-sm">Example questions:</p>
                      <ul className="text-sm mt-2 space-y-1">
                        <li>"When is the best time to hedge my USD expenses?"</li>
                        <li>"How do I know if I'm getting a good rate?"</li>
                        <li>"What's the difference between buying and selling in hedging?"</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  chatHistory.map((message, index) => (
                    <div 
                      key={index}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div 
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2",
                          message.role === "user" 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150"></div>
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your question about currency hedging..."
                    className="resize-none"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!userInput.trim() || isLoading}
                    className="h-auto"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
