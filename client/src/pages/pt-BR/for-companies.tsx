import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Construction, 
  Lock, 
  Code, 
  Zap, 
  Shield, 
  BarChart3, 
  Webhook, 
  FileText,
  ArrowRight,
  Building2,
  Bitcoin,
  Ship,
  Target,
  Check,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const WorldMapVisualization = () => (
  <div className="relative w-full h-[350px] md:h-[450px] rounded-2xl overflow-hidden">
    <svg viewBox="0 0 1000 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#0f172a", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#1e293b", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#0f172a", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#334155", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#475569", stopOpacity: 1 }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="landShadow">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#mapBg)" />
      
      <g stroke="#475569" strokeWidth="0.5" opacity="0.3">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 62.5} x2="1000" y2={i * 62.5} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <line key={`v${i}`} x1={i * 83.3} y1="0" x2={i * 83.3} y2="500" />
        ))}
      </g>
      
      <g fill="url(#landGradient)" stroke="#64748b" strokeWidth="1" filter="url(#landShadow)">
        <path d="M120,80 L180,60 L220,70 L260,55 L300,65 L280,90 L300,110 L280,140 L240,160 L200,150 L160,170 L120,150 L100,120 L110,95 Z" />
        <path d="M130,180 L150,175 L170,190 L180,220 L160,280 L130,320 L100,300 L90,250 L100,200 Z" />
        
        <path d="M380,50 L420,40 L480,45 L520,55 L560,50 L600,60 L580,90 L620,100 L640,80 L680,90 L660,120 L700,130 L680,160 L640,170 L600,160 L560,180 L520,170 L480,190 L440,180 L400,160 L360,140 L340,100 L360,70 Z" />
        
        <path d="M420,200 L460,190 L500,200 L540,195 L560,220 L540,260 L560,300 L540,340 L500,370 L460,380 L420,360 L400,320 L420,280 L400,240 L420,210 Z" />
        
        <path d="M720,100 L780,80 L840,90 L900,80 L940,100 L920,140 L950,180 L920,220 L880,200 L840,220 L800,200 L760,220 L720,200 L700,160 L720,120 Z" />
        <path d="M760,240 L800,230 L840,250 L860,290 L840,330 L800,350 L760,330 L740,290 Z" />
        
        <path d="M820,380 L880,360 L940,380 L960,420 L940,460 L880,480 L820,460 L800,420 Z" />
      </g>
      
      <g filter="url(#glow)">
        <circle cx="200" cy="120" r="10" fill="#22c55e" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="200" y="100" textAnchor="middle" className="text-sm font-bold" fill="#22c55e">$</text>
        
        <circle cx="480" cy="140" r="10" fill="#3b82f6" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <text x="480" y="120" textAnchor="middle" className="text-sm font-bold" fill="#3b82f6">€</text>
        
        <circle cx="860" cy="150" r="10" fill="#ef4444" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin="1s" />
        </circle>
        <text x="860" y="130" textAnchor="middle" className="text-sm font-bold" fill="#ef4444">¥</text>
        
        <circle cx="140" cy="260" r="10" fill="#f59e0b" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin="1.5s" />
        </circle>
        <text x="140" y="240" textAnchor="middle" className="text-sm font-bold" fill="#f59e0b">R$</text>
        
        <circle cx="620" cy="130" r="10" fill="#8b5cf6" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin="0.75s" />
        </circle>
        <text x="620" y="110" textAnchor="middle" className="text-sm font-bold" fill="#8b5cf6">£</text>
        
        <circle cx="480" cy="300" r="10" fill="#06b6d4" opacity="0.9">
          <animate attributeName="r" values="10;14;10" dur="2s" repeatCount="indefinite" begin="1.25s" />
        </circle>
        <text x="480" y="280" textAnchor="middle" className="text-sm font-bold" fill="#06b6d4">₦</text>
      </g>
      
      <g strokeWidth="2" fill="none">
        <path d="M210,120 Q350,80 470,140" stroke="#22c55e" opacity="0.6">
          <animate attributeName="stroke-dasharray" values="0,500;300,500" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M490,140 Q550,135 610,130" stroke="#3b82f6" opacity="0.6">
          <animate attributeName="stroke-dasharray" values="0,500;150,500" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </path>
        <path d="M630,130 Q750,120 850,150" stroke="#8b5cf6" opacity="0.6">
          <animate attributeName="stroke-dasharray" values="0,500;250,500" dur="2.5s" repeatCount="indefinite" begin="1s" />
        </path>
        <path d="M150,260 Q280,200 460,140" stroke="#f59e0b" opacity="0.6">
          <animate attributeName="stroke-dasharray" values="0,500;350,500" dur="3.5s" repeatCount="indefinite" begin="0.75s" />
        </path>
        <path d="M490,290 Q520,220 490,150" stroke="#06b6d4" opacity="0.6">
          <animate attributeName="stroke-dasharray" values="0,500;180,500" dur="2s" repeatCount="indefinite" begin="1.25s" />
        </path>
        <path d="M200,125 Q170,200 145,250" stroke="#22c55e" opacity="0.4">
          <animate attributeName="stroke-dasharray" values="0,500;150,500" dur="2.5s" repeatCount="indefinite" begin="1.5s" />
        </path>
      </g>
      
      <g opacity="0.9">
        <polygon points="465,138 475,143 465,148" fill="#3b82f6">
          <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite" />
        </polygon>
        <polygon points="605,128 615,133 605,138" fill="#8b5cf6">
          <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </polygon>
        <polygon points="845,148 855,153 845,158" fill="#ef4444">
          <animate attributeName="opacity" values="0;1;0" dur="2.5s" repeatCount="indefinite" begin="1s" />
        </polygon>
      </g>
      
      <text x="50" y="480" fill="#64748b" fontSize="12" opacity="0.5">Rede Global de Fluxo de Moedas</text>
    </svg>
  </div>
);

const CodeSnippet = () => (
  <div className="bg-zinc-900 rounded-lg p-4 md:p-6 text-sm font-mono overflow-x-auto">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-3 h-3 rounded-full bg-red-500" />
      <div className="w-3 h-3 rounded-full bg-yellow-500" />
      <div className="w-3 h-3 rounded-full bg-green-500" />
      <span className="text-zinc-500 ml-2 text-xs">hedge-order.ts</span>
    </div>
    <pre className="text-zinc-300 whitespace-pre-wrap">
<span className="text-purple-400">const</span> <span className="text-blue-400">apiKey</span> = process.env.<span className="text-yellow-400">HEDGI_API_KEY</span>;

<span className="text-purple-400">const</span> {"{"} order_id, broker, entry_price, status {"}"} = <span className="text-purple-400">await</span> (
  <span className="text-purple-400">await</span> fetch(<span className="text-green-400">"https://api.hedgi.ai/api/orders"</span>, {"{"}
    method: <span className="text-green-400">"POST"</span>,
    headers: {"{"}
      <span className="text-green-400">Authorization</span>: <span className="text-green-400">`Bearer ${"{"}apiKey{"}"}`</span>,
      <span className="text-green-400">"Content-Type"</span>: <span className="text-green-400">"application/json"</span>
    {"}"},
    body: JSON.stringify({"{"}
      symbol: <span className="text-green-400">"EURUSD"</span>,
      direction: <span className="text-green-400">"buy"</span>,
      volume: <span className="text-yellow-400">0.1</span>,
      duration_days: <span className="text-yellow-400">7</span>
    {"}"})
  {"}"})
).json();
    </pre>
  </div>
);

const SandboxRequestForm = () => {
  const [formData, setFormData] = useState({
    company: '',
    useCase: '',
    volumeBand: '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sandbox request:', formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company">Nome da Empresa</Label>
        <Input 
          id="company" 
          placeholder="Nome da sua empresa"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="useCase">Caso de Uso</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione seu caso de uso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remittance">Remessas / Pagamentos Internacionais</SelectItem>
            <SelectItem value="crypto">Operações Crypto On/Off-Ramp</SelectItem>
            <SelectItem value="import-export">Comércio de Importação / Exportação</SelectItem>
            <SelectItem value="media-spend">Gastos com Mídia Internacional / Afiliados</SelectItem>
            <SelectItem value="treasury">Tesouraria / Gestão de FX Interna</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">Volume Mensal de FX</Label>
        <Select value={formData.volumeBand} onValueChange={(value) => setFormData({ ...formData, volumeBand: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a faixa de volume" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under-100k">Menos de $100K</SelectItem>
            <SelectItem value="100k-500k">$100K - $500K</SelectItem>
            <SelectItem value="500k-1m">$500K - $1M</SelectItem>
            <SelectItem value="1m-5m">$1M - $5M</SelectItem>
            <SelectItem value="over-5m">Mais de $5M</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="email">Email Corporativo</Label>
        <Input 
          id="email" 
          type="email"
          placeholder="voce@empresa.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        Solicitar Acesso ao Sandbox
      </Button>
    </form>
  );
};

const SolutionCard = ({ 
  icon: Icon, 
  title, 
  pain, 
  outcome, 
  example 
}: { 
  icon: any; 
  title: string; 
  pain: string; 
  outcome: string; 
  example: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="h-full hover:border-primary/40 transition-colors">
      <CardHeader>
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{pain}</p>
        <p className="text-sm font-medium text-foreground">{outcome}</p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="px-0 text-primary hover:text-primary/80">
              Ver exemplo de fluxo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title} - Exemplo de Fluxo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">1</div>
                <div>
                  <p className="font-medium">Detectar Exposição</p>
                  <p className="text-sm text-muted-foreground">{example.split('→')[0]}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">2</div>
                <div>
                  <p className="font-medium">Solicitar Cotação</p>
                  <p className="text-sm text-muted-foreground">Chame a API da Hedgi para obter uma cotação em tempo real</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">3</div>
                <div>
                  <p className="font-medium">Travar Taxa</p>
                  <p className="text-sm text-muted-foreground">Execute o hedge para travar sua taxa</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">4</div>
                <div>
                  <p className="font-medium">Rastrear e Reconciliar</p>
                  <p className="text-sm text-muted-foreground">Receba webhooks e acesse relatórios para liquidação</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default function ForCompanies() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "HedgiDev2025") {
      setIsAuthenticated(true);
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  const renderUnderConstruction = () => (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-6 w-6" />
              Para Empresas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Em breve
            </p>
            
            <div className="border-t pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  Acesso para Desenvolvedores
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Digite a senha de desenvolvedor"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline">
                    Acessar
                  </Button>
                </div>
                {showError && (
                  <p className="text-sm text-red-500">Senha incorreta</p>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );

  const renderMainPage = () => (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 opacity-3 -z-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bgGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>
          <path d="M0,200 Q250,100 500,180 T1000,150" stroke="url(#bgGradient1)" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M0,600 Q200,500 400,580 T1000,550" stroke="url(#bgGradient1)" strokeWidth="1" fill="none" opacity="0.2" />
        </svg>
      </div>

      <main className="relative z-10">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground leading-tight">
                  Todo pagamento internacional e transação cross-border é uma posição em FX.
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Hedgi é uma API de Hedge Cambial para equipes que querem incorporar proteção cambial em seus produtos ou fazer hedge de exposição interna — com endpoints REST focados em desenvolvedores e documentação interativa.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Solicitar Acesso ao Sandbox
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Solicitar Acesso ao Sandbox</DialogTitle>
                      </DialogHeader>
                      <SandboxRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      Ver Documentação <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Funciona com seus fluxos de pagamento/liquidação existentes
                </p>
              </div>
              <div className="space-y-6">
                <CodeSnippet />
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Exposição</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                  <span>Simular</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>Cotação</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>Hedge</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 text-center">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">$9 trilhões</p>
                <p className="text-sm text-muted-foreground">Volume diário do mercado FX</p>
              </div>
              <div className="hidden md:block w-px h-12 bg-border" />
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">~$1 quatrilhão</p>
                <p className="text-sm text-muted-foreground">Pagamentos internacionais e cripto em 2024</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
                Rede Global de Fluxo de Moedas
              </h2>
              <p className="text-muted-foreground">
                Hedge em tempo real nos principais corredores de moedas
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50">
              <WorldMapVisualization />
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Infraestrutura de hedge que você pode chamar.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tudo que você precisa para integrar hedge cambial ao seu produto, acessível via API REST.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Obter Cotações de Hedge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Precifique uma exposição programaticamente com taxas de mercado em tempo real.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Travar Taxas e Executar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Converta cotações em hedges e trave suas taxas instantaneamente.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Rastrear Posições</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Monitore o que está aberto vs protegido com visibilidade completa da exposição.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Webhook className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Webhooks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Receba eventos de ciclo de vida e atualizações de status diretamente no seu sistema.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Relatórios e Exportações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Gere resumos prontos para finanças e relatórios compatíveis com auditoria.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Documentação Interativa</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Teste endpoints ao vivo na nossa documentação estilo Swagger.</p>
                  <Button variant="ghost" size="sm" className="mt-3 px-0 text-primary hover:text-primary/80" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      Explorar docs <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Construído para seu caso de uso
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Seja construindo um produto ou gerenciando tesouraria, Hedgi se adapta ao seu fluxo de trabalho.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <SolutionCard
                icon={Building2}
                title="Empresas de Remessas"
                pain="A volatilidade cambial entre cotação e liquidação corrói margens em transferências internacionais."
                outcome="Ofereça taxas FX travadas no checkout e proteja sua margem em cada transferência."
                example="Cliente inicia transferência → Taxa cotada travada → Liquidação processada → Margem protegida"
              />

              <SolutionCard
                icon={Bitcoin}
                title="Empresas de Crypto"
                pain="Gaps de timing de liquidação e conversões de tesouraria criam exposição FX não protegida."
                outcome="Faça hedge da exposição FX criada por operações on/off-ramp e gestão de tesouraria."
                example="Usuário faz on-ramp de fiat → Exposição FX detectada → Hedge executado → Liquidação completa"
              />

              <SolutionCard
                icon={Ship}
                title="Empresas de Importação / Exportação"
                pain="Ciclos longos de pagamento do PO ao embarque até o pagamento deixam margem vulnerável a movimentos FX."
                outcome="Proteja a margem em contas a pagar e receber durante todo o ciclo comercial."
                example="PO criado → Exposição identificada → Hedge travado → Fatura liquidada na taxa protegida"
              />

              <SolutionCard
                icon={Target}
                title="Afiliados e Performance Marketing"
                pain="Gastos com mídia internacional em múltiplas moedas tornam CAC/ROAS imprevisíveis."
                outcome="Estabilize custos de aquisição de clientes fazendo hedge da moeda de gasto previsto."
                example="Orçamento alocado → Exposição cambial prevista → Hedge travado → Gasto executado na taxa conhecida"
              />
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Como funciona
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Quatro passos simples para proteger sua exposição FX
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Detectar Exposição</h3>
                  <p className="text-sm text-muted-foreground">Identifique exposição FX nas suas transações ou tesouraria</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Solicitar Cotação</h3>
                  <p className="text-sm text-muted-foreground">Chame a API para obter uma cotação de hedge em tempo real</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Travar e Executar</h3>
                  <p className="text-sm text-muted-foreground">Converta a cotação em hedge e trave sua taxa</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold mb-2">Rastrear e Reconciliar</h3>
                  <p className="text-sm text-muted-foreground">Receba webhooks e gere relatórios</p>
                </div>
              </div>

              <div className="hidden md:block mt-8">
                <div className="relative h-2">
                  <div className="absolute inset-0 bg-primary/20 rounded-full" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
                  <div className="absolute left-1/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
                  <div className="absolute left-2/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  Construído para fluxos financeiros
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Segurança e confiabilidade de nível empresarial para suas operações de hedge
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Autenticação por API Key</h3>
                    <p className="text-sm text-muted-foreground">Acesso seguro com chaves API de menor privilégio</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Suporte a Idempotência</h3>
                    <p className="text-sm text-muted-foreground">Retentativas seguras com chaves de idempotência e rate limits</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Webhook className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Webhooks Assinados</h3>
                    <p className="text-sm text-muted-foreground">Payloads de webhook assinados criptograficamente</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Logs de Auditoria</h3>
                    <p className="text-sm text-muted-foreground">Trilha de auditoria completa para requisitos de compliance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Torne-se um parceiro de design de lançamento
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Junte-se ao nosso programa de acesso antecipado e ajude a moldar o futuro do hedge FX programático.
              </p>

              <Card className="p-6 md:p-8">
                <SandboxRequestForm />
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground mb-4">Ou explore nossa documentação primeiro:</p>
                  <Button variant="outline" size="lg" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      Ver Documentação da API <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <footer className="py-12 border-t bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img src="/Hedgi.png?v=4" alt="Hedgi Logo" className="h-8 w-auto rounded" />
                <span className="text-sm text-muted-foreground">API de Hedge Cambial</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <a href="/about-us" className="hover:text-foreground transition-colors">Sobre</a>
                <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Documentação da API</a>
                <a href="mailto:contact@hedgi.ai" className="hover:text-foreground transition-colors">Contato</a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Hedgi. Todos os direitos reservados.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );

  return (
    <>
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      {isAuthenticated ? renderMainPage() : renderUnderConstruction()}
    </>
  );
}
