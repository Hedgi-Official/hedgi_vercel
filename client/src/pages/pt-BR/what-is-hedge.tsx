import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Building2, 
  Plane, 
  Wheat, 
  GraduationCap, 
  Home, 
  Luggage, 
  DollarSign, 
  Umbrella,
  TrendingUp,
  TrendingDown,
  ArrowDown,
  ArrowUp,
  Check
} from "lucide-react";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Link } from "wouter";

export default function WhatIsHedge() {
  return (
    <>
      <Header showAuthButton />
      
      {/* Seção Hero */}
      <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">O que é Hedging?</h1>
          
          {/* Animação de moeda */}
          <div className="flex justify-center items-center mb-8 py-6">
            <div className="relative flex items-center space-x-4 p-4 rounded-lg bg-card shadow-md">
              <div className="text-3xl font-bold text-primary flex items-center">
                <span>USD</span>
                <div className="mx-4 flex flex-col">
                  <TrendingUp className="h-6 w-6 text-primary animate-pulse" />
                  <TrendingDown className="h-6 w-6 text-destructive animate-pulse" />
                </div>
                <span>BRL</span>
              </div>
              <ArrowRight className="h-8 w-8" />
              <div className="flex items-center space-x-2">
                <Shield className="h-10 w-10 text-primary" />
                <div className="text-3xl font-bold">
                  <span>USD</span>
                  <span className="mx-2">=</span>
                  <span>BRL</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-lg md:text-xl text-center mb-8">
            Hedging é uma estratégia financeira utilizada para reduzir o risco causado por flutuações de preços, taxas de juros, 
            moedas ou outras incertezas de mercado. Simplificando, o hedging funciona como um seguro, protegendo investidores, 
            empresas e indivíduos contra perdas financeiras inesperadas devido à volatilidade do mercado.
          </p>
        </div>
      </section>
      
      {/* Seção de Hedging Institucional */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Como Empresas e Instituições Utilizam o Hedging?</h2>
          
          <p className="text-lg mb-8">
            Empresas e instituições financeiras frequentemente utilizam o hedging para proteger suas operações e lucros.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Plane className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Companhias Aéreas</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Fazem hedging do preço do combustível para se protegerem contra aumentos no preço do petróleo.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Wheat className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Empresas Agrícolas</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Fazem hedging dos preços das safras para garantir receitas previsíveis.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Building2 className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Multinacionais</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Fazem hedging cambial para gerenciar riscos das operações internacionais.</p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-center text-muted-foreground">
            Historicamente, essas estratégias sofisticadas eram reservadas para grandes empresas e instituições financeiras, 
            que têm acesso a produtos financeiros específicos e equipes especializadas.
          </p>
        </div>
      </section>
      
      {/* Seção de Hedging para Indivíduos */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Mas e os indivíduos?</h2>
          
          <p className="text-lg mb-8">
            Indivíduos também enfrentam riscos semelhantes, especialmente relacionados às oscilações cambiais. Por exemplo:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <GraduationCap className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Educação</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Custos com educação no exterior que flutuam devido ao câmbio.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Home className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Imóveis</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Compra de imóveis no exterior que se tornam inesperadamente caros.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Luggage className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Viagens</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Despesas de viagens internacionais que aumentam abruptamente devido a mudanças cambiais.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <DollarSign className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Investimentos</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Investimentos e economias perdendo valor por causa da volatilidade cambial.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Seção de Exemplo */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Exemplo: Viagem em família para a Disney</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowDown className="mr-2 h-5 w-5 text-destructive" />
                  Sem Hedging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Uma família brasileira planeja uma viagem à Disney, que hoje custa R$ 50 mil. 
                  Se o dólar subir, o custo pode aumentar significativamente até a data da viagem.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Custo Inicial:</span>
                    <span className="font-bold">R$ 50.000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Variação Cambial:</span>
                    <span className="font-bold text-destructive">+ R$ 10.000</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Custo Final:</span>
                    <span className="font-bold text-destructive">R$ 60.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  Com Hedging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  A família trava a taxa de câmbio atual, garantindo que o custo da viagem permaneça estável, 
                  independentemente das variações do mercado.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Custo Inicial:</span>
                    <span className="font-bold">R$ 50.000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Variação Cambial:</span>
                    <span className="font-bold text-green-500">R$ 0</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Custo Final:</span>
                    <span className="font-bold">R$ 50.000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-center mb-8 text-muted-foreground">
            Infelizmente, a maioria das instituições financeiras não oferece soluções de hedging adaptadas 
            às necessidades específicas e à escala dos clientes individuais.
          </p>
        </div>
      </section>
      
      {/* Seção do Simulador Interativo */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Experimente: Simulador de Hedge Cambial</h2>
          <p className="text-lg text-center mb-8">
            Veja como o hedging cambial pode proteger suas despesas futuras das flutuações do câmbio.
          </p>
          
          <CurrencySimulator showGraph={false} />
        </div>
      </section>
      
      {/* Seção de Apresentação da Hedgi */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center mb-6">
            <Umbrella className="h-16 w-16 text-primary" />
          </div>
          
          <h2 className="text-3xl font-bold mb-6 text-center">
            Conheça a Hedgi: Soluções de Hedging Feitas para Você
          </h2>
          
          <p className="text-lg text-center mb-8">
            Na Hedgi, acreditamos que todas as pessoas merecem ter tranquilidade financeira. Por isso, 
            criamos soluções de hedging especialmente desenhadas para indivíduos.
          </p>
          
          <div className="space-y-4 max-w-2xl mx-auto mb-10">
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Fácil de usar: Ferramentas simples e intuitivas.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Transparente: Sem taxas escondidas ou linguagem complicada.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Seguro: Soluções confiáveis que protegem seu dinheiro e tranquilidade.</p>
            </div>
          </div>
          
          <p className="text-lg text-center mb-8">
            Assuma o controle do seu futuro financeiro e proteja-se da volatilidade cambial. 
            Hedging não é mais exclusividade de grandes instituições—agora é para você também.
          </p>
          
          <div className="flex justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg">
                Descubra como é fácil proteger seu dinheiro com a Hedgi
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

// Componente da seta para a direita na animação
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14"></path>
      <path d="m12 5 7 7-7 7"></path>
    </svg>
  );
}