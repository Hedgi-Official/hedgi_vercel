import * as React from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="min-h-screen bg-background">

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <Globe className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">O que é a Hedgi?</h1>
              <p className="text-2xl md:text-3xl font-semibold mb-4 text-foreground">
                Seguro Cambial para Todos.
              </p>
              <p className="text-lg md:text-xl mb-8 text-muted-foreground">
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
        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Por Que Escolher a Hedgi</h2>
              <p className="text-lg text-muted-foreground">
                Seguro cambial simples para qualquer pessoa que compra de outros países
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Zap className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Radicamente Simples</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Apenas digite o valor e período. Sem jargões, sem termos complexos. Nós cuidamos de todo o resto.</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Shield className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Sempre Confiável</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Seu seguro cambial é respaldado por infraestrutura financeira confiável. Proteção automática e segura.</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Globe className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Para Todos</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Seja você comprando produtos online, pagando fornecedores no exterior, ou fazendo compras internacionais - protegemos seu dinheiro.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Technology Section */}
        <section className="py-16 px-4 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4 text-foreground">Como Funciona</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                A Hedgi fornece "seguro cambial" para empresas - uma maneira simples de se proteger contra oscilações do câmbio. 
                Você apenas insere o valor e período, e a Hedgi executa automaticamente a proteção.
                Sem jargões, sem barreiras. <span className="font-semibold text-primary">Nunca veja termos complexos como taxas de swap ou requisitos de margem</span>.
                Foque no seu negócio enquanto nós cuidamos do risco cambial.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Building className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Para Empresas</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Importa produtos, paga fornecedores ou gerencia transações internacionais? Fixe seus custos e proteja suas margens.</p>
                </CardContent>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Users className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Para Indivíduos</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Fazendo compras online em lojas estrangeiras? Fazendo compras internacionais? Proteja-se das oscilações cambiais.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Contact & CTA Section */}
        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6 text-foreground">Pronto para Começar?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Pare de perder dinheiro com flutuações cambiais ao comprar de outros países.
                Com a <span className="font-semibold text-primary">Hedgi</span>, a proteção cambial se torna tão simples quanto
                contratar um seguro — automática, acessível e sem estresse.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="text-lg"
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
                  className="text-lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Entre em Contato
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>Dúvidas? Entre em contato com nossa equipe:</p>
                <a 
                  href="mailto:hjalmar@hedgi.ai" 
                  className="text-primary hover:text-primary/80 font-medium"
                >
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