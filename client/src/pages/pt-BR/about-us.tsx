import * as React from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Globe, Shield, TrendingUp, Zap, Mail, Users, Building } from "lucide-react";

export default function AboutUs() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Abstract Background Pattern */}
      <div className="absolute inset-0 opacity-5 -z-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: "hsl(var(--primary))", stopOpacity: 0.3}} />
              <stop offset="50%" style={{stopColor: "hsl(120, 60%, 50%)", stopOpacity: 0.2}} />
              <stop offset="100%" style={{stopColor: "hsl(200, 60%, 50%)", stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
          {/* Abstract flowing lines representing financial data */}
          <path d="M0,200 Q250,100 500,180 T1000,150" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.6"/>
          <path d="M0,400 Q300,300 600,380 T1000,350" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.4"/>
          <path d="M0,600 Q200,500 400,580 T1000,550" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.3"/>
          {/* Currency symbols scattered */}
          <text x="100" y="300" fontSize="24" fill="url(#gradient1)" opacity="0.3">$</text>
          <text x="800" y="200" fontSize="24" fill="url(#gradient1)" opacity="0.3">€</text>
          <text x="600" y="700" fontSize="24" fill="url(#gradient1)" opacity="0.3">R$</text>
          <text x="300" y="800" fontSize="24" fill="url(#gradient1)" opacity="0.3">¥</text>
        </svg>
      </div>

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section with Gradient Background */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-green-500/5 to-blue-500/5"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="mb-8 flex justify-center">
                <div className="relative">
                  <Globe className="w-16 h-16 text-primary animate-pulse" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full animate-ping"></div>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 pb-1 
                bg-gradient-to-r from-primary via-green-600 to-blue-600 bg-clip-text text-transparent">
                O que é a Hedgi?
              </h1>
              <p className="text-2xl md:text-3xl font-semibold mb-4 text-foreground">
                Seguro Cambial para Todos.
              </p>
              <p className="text-lg md:text-xl mb-12 text-muted-foreground max-w-2xl mx-auto">
                Proteja seu dinheiro contra flutuações cambiais ao comprar de outros países. Proteção simples e automática para empresas e indivíduos.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-gradient-to-r from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex items-center mb-6">
                    <Shield className="w-8 h-8 text-primary mr-3" />
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Nossa Missão</h2>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                    75% das empresas que não usam proteção cambial perdem dinheiro devido às flutuações. Movimentos cambiais apagaram US$ 9,83 bilhões dos lucros corporativos em apenas um trimestre.
                    Na <span className="font-semibold text-primary">Hedgi</span>, oferecemos seguro cambial simples para que você nunca perca dinheiro ao comprar de outros países - seja você uma empresa ou um indivíduo.
                  </p>
                  <div className="flex items-center text-primary font-medium">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    <span>Protegendo empresas desde 2024</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-2xl p-8 backdrop-blur-sm border border-primary/20">
                    <div className="grid grid-cols-2 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-bold text-primary mb-2">75%</div>
                        <div className="text-sm text-muted-foreground">Empresas Perdem Dinheiro</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-primary mb-2">US$ 9,8 bi</div>
                        <div className="text-sm text-muted-foreground">Perdidos em Movimentos Cambiais</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-primary mb-2">81%</div>
                        <div className="text-sm text-muted-foreground">Empresas Usam Proteção</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-primary mb-2">52%</div>
                        <div className="text-sm text-muted-foreground">Agora Considerando</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Por Que Escolher a Hedgi</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Seguro cambial simples para qualquer pessoa que compra de outros países
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Radicamente Simples</h3>
                  <p className="text-muted-foreground">
                    Apenas digite o valor e período. Sem jargões, sem termos complexos. Nós cuidamos de todo o resto.
                  </p>
                </div>

                <div className="group p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Sempre Confiável</h3>
                  <p className="text-muted-foreground">
                    Seu seguro cambial é respaldado por infraestrutura financeira confiável. Proteção automática e segura.
                  </p>
                </div>

                <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10 hover:border-blue-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Para Todos</h3>
                  <p className="text-muted-foreground">
                    Seja você comprando produtos online, pagando fornecedores no exterior, ou fazendo compras internacionais - protegemos seu dinheiro.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="mb-8">
                <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Como Funciona</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                A Hedgi fornece "seguro cambial" para empresas - uma maneira simples de se proteger contra oscilações do câmbio. 
                Você apenas insere o valor e período, e a Hedgi executa automaticamente a proteção.
                Sem jargões, sem barreiras. <span className="font-semibold text-primary">Nunca veja termos complexos como taxas de swap ou requisitos de margem</span>.
                Foque no seu negócio enquanto nós cuidamos do risco cambial.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="text-left p-6 bg-background rounded-xl border border-border">
                  <Building className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Para Empresas</h3>
                  <p className="text-muted-foreground">
                    Importa produtos, paga fornecedores ou gerencia transações internacionais? Fixe seus custos e proteja suas margens.
                  </p>
                </div>
                <div className="text-left p-6 bg-background rounded-xl border border-border">
                  <Users className="w-8 h-8 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-3">Para Indivíduos</h3>
                  <p className="text-muted-foreground">
                    Fazendo compras online em lojas estrangeiras? Fazendo compras internacionais? Proteja-se das oscilações cambiais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Pronto para Começar?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Pare de perder dinheiro com flutuações cambiais ao comprar de outros países.
                Com a <span className="font-semibold text-primary">Hedgi</span>, a proteção cambial se torna tão simples quanto
                contratar um seguro — automática, acessível e sem estresse.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Obter Seguro Cambial
                </Button>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>ou</span>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = 'mailto:hjalmar@hedgi.ai?subject=Consulta sobre Serviços da Hedgi'}
                  className="px-8 py-4 text-lg border-2 hover:bg-accent/50 transition-all duration-300"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Entre em Contato
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground border-t pt-8">
                <p className="mb-2">Dúvidas? Entre em contato com nossa equipe</p>
                <a href="mailto:hjalmar@hedgi.ai" className="text-primary hover:text-primary/80 font-medium transition-colors">
                  hjalmar@hedgi.ai
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}