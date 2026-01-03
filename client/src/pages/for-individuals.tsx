import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/header";
import { EnhancedCurrencySimulator } from "@/components/enhanced-currency-simulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { 
  ShoppingCart, 
  Plane, 
  GraduationCap, 
  Briefcase, 
  Send, 
  MessageCircle, 
  Loader2,
  Shield,
  Clock,
  ArrowRight,
  Sparkles
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
        <p className="text-xs text-primary/80">{example}</p>
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
    {type: 'bot', content: t('forIndividuals.chatWelcome')}
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
        title: t('forIndividuals.chatErrorTitle'),
        description: t('forIndividuals.chatErrorDesc'),
        variant: "destructive",
      });

      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: t('forIndividuals.chatErrorFallback')
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
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
          {/* Hero Section - Two Column Layout */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Text */}
                <div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                    {t('forIndividuals.heroTitle')}
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    {t('forIndividuals.heroSubtitle')}
                  </p>
                  
                  {/* Benefit Chips */}
                  <div className="flex flex-col gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground text-sm">{t('forIndividuals.chip1Title')}</span>
                        <span className="text-muted-foreground text-sm"> — {t('forIndividuals.chip1Desc')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground text-sm">{t('forIndividuals.chip2Title')}</span>
                        <span className="text-muted-foreground text-sm"> — {t('forIndividuals.chip2Desc')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground text-sm">{t('forIndividuals.chip3Title')}</span>
                        <span className="text-muted-foreground text-sm"> — {t('forIndividuals.chip3Desc')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                      <Link href="/auth?type=individual">
                        {t('cta.Get Currency Insurance')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <a href="#try-it">{t('forIndividuals.trySimulator')}</a>
                    </Button>
                  </div>
                </div>

                {/* Right Column - Images Grid */}
                <div className="grid grid-cols-2 gap-4">
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

          {/* Lifestyle Section */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('forIndividuals.lifestyleTitle')}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {t('forIndividuals.lifestyleSubtitle')}
                </p>
                <p className="text-lg font-medium text-foreground mb-2">
                  {t('forIndividuals.lifestyleSectionTitle')}
                </p>
                <p className="text-muted-foreground">
                  {t('forIndividuals.lifestyleSectionSubtitle')}
                </p>
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('forIndividuals.useCasesTitle')}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <UseCaseCard
                  icon={ShoppingCart}
                  title={t('forIndividuals.card1Title')}
                  description={t('forIndividuals.card1Desc')}
                  example={t('forIndividuals.card1Example')}
                />

                <UseCaseCard
                  icon={Plane}
                  title={t('forIndividuals.card2Title')}
                  description={t('forIndividuals.card2Desc')}
                  example={t('forIndividuals.card2Example')}
                />

                <UseCaseCard
                  icon={GraduationCap}
                  title={t('forIndividuals.card3Title')}
                  description={t('forIndividuals.card3Desc')}
                  example={t('forIndividuals.card3Example')}
                />

                <UseCaseCard
                  icon={Briefcase}
                  title={t('forIndividuals.card4Title')}
                  description={t('forIndividuals.card4Desc')}
                  example={t('forIndividuals.card4Example')}
                />
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('forIndividuals.howItWorksTitle')}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t('forIndividuals.howItWorksSubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('forIndividuals.step1Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('forIndividuals.step1Desc')}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('forIndividuals.step2Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('forIndividuals.step2Desc')}
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{t('forIndividuals.step3Title')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('forIndividuals.step3Desc')}
                  </p>
                </div>
              </div>

              <div className="text-center mt-10">
                <Button size="lg" asChild>
                  <Link href="/auth?type=individual">
                    {t('forIndividuals.createAccount')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* Interactive Tools Section */}
          <section id="try-it" className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('forIndividuals.tryItTitle')}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t('forIndividuals.tryItSubtitle')}
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
                        {t('forIndividuals.chatTitle')}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('forIndividuals.chatPrompt')}
                      </p>
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
                                  <span>{t('forIndividuals.chatThinking')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex items-center mt-4 flex-shrink-0">
                        <Input
                          placeholder={t('forIndividuals.chatPlaceholder')}
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
                  <div ref={simulatorRef}>
                    <Card className="shadow-lg">
                      <CardHeader>
                        <CardTitle>{t('forIndividuals.simulatorTitle')}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {t('forIndividuals.simulatorHelper')}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <EnhancedCurrencySimulator showGraph={false} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 bg-primary/5">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                {t('forIndividuals.ctaTitle')}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                {t('forIndividuals.ctaBody')}
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/auth?type=individual">
                  {t('cta.Get Currency Insurance')}
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
