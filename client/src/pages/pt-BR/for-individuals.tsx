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

export default function ForIndividualsPTBR() {
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
    {type: 'bot', content: 'Olá! Eu sou o HedgiBot. Posso te ajudar a entender como configurar e gerenciar hedge cambial. Para qual evento você gostaria de fazer hedge?'}
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
          language: 'pt-BR'
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Falha ao obter resposta do HedgiBot');
      }

      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: data.message
        }
      ]);
    } catch (error) {
      console.error('Erro ao chamar API de chat:', error);

      toast({
        title: "Erro de Chat",
        description: "Desculpe, não consegui me conectar à minha base de conhecimento. Por favor, tente novamente.",
        variant: "destructive",
      });

      setChatMessages(prev => [
        ...prev, 
        {
          type: 'bot', 
          content: "Estou tendo problemas para me conectar à minha base de conhecimento no momento. Por favor, tente novamente em breve."
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
        content: "Olá! Eu sou o HedgiBot. Como posso te ajudar a configurar proteção cambial hoje?"
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
                  Para Indivíduos
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                  Proteja Seu Dinheiro das Oscilações Cambiais
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                  Seja comprando online, planejando uma viagem ou recebendo dinheiro do exterior, 
                  a Hedgi ajuda você a travar taxas de câmbio e evitar surpresas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                    <Link href="/auth?type=individual">
                      Comece Gratuitamente
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#try-it">Experimente o Simulador</a>
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
                    <p className="font-semibold text-foreground">Taxas Protegidas</p>
                    <p className="text-sm text-muted-foreground">Trave a taxa de hoje</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-border" />
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Processo Simples</p>
                    <p className="text-sm text-muted-foreground">Sem jargão necessário</p>
                  </div>
                </div>
                <div className="hidden md:block w-px h-12 bg-border" />
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-semibold text-foreground">Duração Flexível</p>
                    <p className="text-sm text-muted-foreground">Dias a meses</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Use Cases Section */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  Perfeito para Necessidades do Dia a Dia
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Proteção cambial não é só para grandes empresas. Veja como pessoas como você usam a Hedgi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
                <UseCaseCard
                  icon={ShoppingCart}
                  title="Compradores Online"
                  description="Comprando em lojas internacionais? Proteja sua compra de mudanças de taxa entre o checkout e a entrega."
                  example="Ex.: Compras na Amazon US, AliExpress"
                />

                <UseCaseCard
                  icon={Plane}
                  title="Viajantes"
                  description="Planejando uma viagem ao exterior? Trave sua taxa de câmbio agora e planeje com confiança."
                  example="Ex.: Férias na Europa, viagem para Disney"
                />

                <UseCaseCard
                  icon={GraduationCap}
                  title="Estudantes no Exterior"
                  description="Pagando mensalidade ou aluguel em moeda estrangeira? Evite a incerteza cambial do semestre."
                  example="Ex.: Mensalidades, custos de moradia"
                />

                <UseCaseCard
                  icon={Briefcase}
                  title="Freelancers"
                  description="Recebendo em USD ou EUR? Proteja seus ganhos de quedas cambiais antes de converter."
                  example="Ex.: Trabalho remoto, consultoria"
                />
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  Como Funciona
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Proteção cambial em três passos simples. Nenhuma experiência financeira necessária.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Conte Sua Necessidade</h3>
                  <p className="text-sm text-muted-foreground">
                    Digite o valor e o par de moedas que deseja proteger
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Escolha a Duração</h3>
                  <p className="text-sm text-muted-foreground">
                    Selecione por quanto tempo precisa de proteção (dias, semanas ou meses)
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Fique Protegido</h3>
                  <p className="text-sm text-muted-foreground">
                    A Hedgi trava sua taxa. Você está protegido das oscilações cambiais.
                  </p>
                </div>
              </div>

              <div className="text-center mt-10">
                <Button size="lg" asChild>
                  <Link href="/auth?type=individual">
                    Crie Sua Conta
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
                  Experimente Você Mesmo
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Use nosso simulador para interagir diretamente ou converse com nosso assistente de IA para ajuda guiada.
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
                        Assistente de IA da Hedgi
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
                                  <span>Pensando...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>

                      <div className="flex items-center mt-4 flex-shrink-0">
                        <Input
                          placeholder="Pergunte sobre hedge cambial..."
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
                Pronto para Proteger Seu Dinheiro?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Junte-se a milhares de pessoas que usam a Hedgi para proteger suas transações internacionais.
              </p>
              <Button size="lg" className="bg-primary hover:bg-primary/90" asChild>
                <Link href="/auth?type=individual">
                  Comece Gratuitamente
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
