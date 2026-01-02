import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { EnhancedCurrencySimulator } from "@/components/enhanced-currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ShoppingCart, 
  Plane, 
  GraduationCap, 
  Briefcase, 
  Send, 
  MessageCircle, 
  Loader2,
  Shield,
  TrendingUp,
  Clock,
  ArrowRight,
  Users,
  Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";

const generateSessionId = () => {
  return `hedgi-chat-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

const UseCaseCard = ({ 
  icon: Icon, 
  title, 
  description, 
  example 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  example: string; 
}) => {
  return (
    <Card className="h-full hover:border-primary/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs font-medium text-primary">{example}</p>
      </CardContent>
    </Card>
  );
};

export default function ForIndividuals() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId());
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<HTMLDivElement>(null);
  const chatCardRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(700);
  const [chatMessages, setChatMessages] = useState<Array<{type: 'user' | 'bot', content: string}>>([
    {type: 'bot', content: 'Hello! I\'m HedgiBot. I can help you understand how to set up and manage currency hedges. For what event would you like to hedge?'}
  ]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

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

    setChatMessages(prev => [...prev, {type: 'user', content: message}]);

    const currentMessage = message;
    setMessage("");
    setIsLoading(true);

    try {
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

      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: data.message
        }
      ]);
    } catch (error) {
      console.error('Error calling chat API:', error);

      toast({
        title: "Chat Error",
        description: "Sorry, I couldn't connect to my knowledge base. Please try again.",
        variant: "destructive",
      });

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

  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([{
        type: 'bot',
        content: "Hi there! I'm HedgiBot. How can I help you set up currency protection today?"
      }]);
    }
  }, [chatMessages]);
  
  useEffect(() => {
    if (!simulatorRef.current || !chatCardRef.current) return;
    
    const timer = setTimeout(() => {
      if (!simulatorRef.current) return;
      
      const simulatorCard = simulatorRef.current!.querySelector('.card-container');
      if (simulatorCard) {
        const initialHeight = simulatorCard.getBoundingClientRect().height;
        if (initialHeight > 100) {
          setContainerHeight(initialHeight);
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const updateHeights = () => {
      if (simulatorRef.current && chatCardRef.current) {
        const simulatorHeight = simulatorRef.current.getBoundingClientRect().height;
        
        if (simulatorHeight > 100 && simulatorHeight !== containerHeight) {
          setContainerHeight(simulatorHeight);
        }
      }
    };
    
    const resizeObserver = new ResizeObserver(updateHeights);
    
    if (simulatorRef.current) {
      resizeObserver.observe(simulatorRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [containerHeight]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Users className="w-4 h-4" />
                  {t('For Individuals')}
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                  Protect Your Money from Currency Swings
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Whether you're shopping online, planning a trip, or receiving money from abroad, 
                  Hedgi helps you lock in exchange rates and avoid surprises.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                    <Link href="/auth?type=individual">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#try-it">Try the Simulator</a>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Protected Rates</p>
                    <p className="text-sm text-muted-foreground">Lock in today's rate</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-border" />
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Simple Process</p>
                    <p className="text-sm text-muted-foreground">No jargon required</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-border" />
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Flexible Duration</p>
                    <p className="text-sm text-muted-foreground">Days to months</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Lifestyle Section - Protect Your Money */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground whitespace-pre-line">
                    {t("lifestyle.tagline")}
                  </h2>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {t("lifestyle.description")}
                  </p>
                </div>

                {/* People Images for Trust */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img
                      src="/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg"
                      alt="Happy customers using Hedgi"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img
                      src="/images/woman-9193216_640.jpg"
                      alt="Professional using currency protection"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img
                      src="/images/family-1542595_640.jpg"
                      alt="Family securing their financial future"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden aspect-square">
                    <img
                      src="/images/gautham-krishna-fy466BrLmgg-unsplash_1750022560441-min.jpg"
                      alt="Experienced investor with peace of mind"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  Perfect for Everyday Needs
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Currency protection isn't just for big companies. Here's how individuals like you use Hedgi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <UseCaseCard
                  icon={ShoppingCart}
                  title="Online Shoppers"
                  description="Buying from international stores? Protect your purchase from rate changes between checkout and delivery."
                  example="E.g., Shopping on Amazon US, AliExpress"
                />

                <UseCaseCard
                  icon={Plane}
                  title="Travelers"
                  description="Planning a trip abroad? Lock in your exchange rate now and budget with confidence."
                  example="E.g., Vacation to Europe, Disney trip"
                />

                <UseCaseCard
                  icon={GraduationCap}
                  title="Students Abroad"
                  description="Paying tuition or rent in foreign currency? Avoid semester-long rate uncertainty."
                  example="E.g., University fees, housing costs"
                />

                <UseCaseCard
                  icon={Briefcase}
                  title="Freelancers"
                  description="Getting paid in USD or EUR? Protect your earnings from currency drops before you convert."
                  example="E.g., Remote work, consulting"
                />
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  How It Works
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Currency protection in three simple steps. No financial experience needed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Tell Us Your Need</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the amount and currency pair you want to protect
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Choose Duration</h3>
                  <p className="text-sm text-muted-foreground">
                    Select how long you need protection (days, weeks, or months)
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Stay Protected</h3>
                  <p className="text-sm text-muted-foreground">
                    Hedgi locks your rate. You're protected from currency swings.
                  </p>
                </div>
              </div>

              <div className="text-center mt-10">
                <Button size="lg" asChild>
                  <Link href="/auth?type=individual">
                    Create Your Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Interactive Tools Section */}
          <section id="try-it" className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  Try It Yourself
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Use our simulator for direct interaction or chat with our AI assistant for guided help.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

                {/* Enhanced Currency Simulator */}
                <div className="order-1 lg:order-2">
                  <div className="enhanced-tooltips" ref={simulatorRef}>
                    <EnhancedCurrencySimulator showGraph={false} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                Ready to Protect Your Money?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of individuals who use Hedgi to protect their international transactions.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/auth?type=individual">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}
