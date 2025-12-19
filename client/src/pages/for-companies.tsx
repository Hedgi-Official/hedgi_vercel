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
          <stop offset="0%" style={{ stopColor: "#0a1628", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#1a2744", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#0a1628", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#2d4a3e", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#3d5a4e", stopOpacity: 1 }} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#mapBg)" />
      
      <g stroke="#1e3a5f" strokeWidth="0.3" opacity="0.4">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((i) => (
          <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="500" />
        ))}
      </g>
      
      <g fill="url(#landGradient)" stroke="#4a7c59" strokeWidth="0.5" opacity="0.9">
        {/* North America */}
        <path d="M50,45 L80,35 L120,30 L150,35 L180,25 L210,30 L240,35 L260,50 L250,65 L270,80 L280,100 L270,115 L285,130 L275,145 L260,155 L245,150 L230,160 L215,155 L195,165 L175,160 L155,170 L140,165 L125,175 L110,170 L95,180 L80,175 L70,160 L55,155 L45,140 L50,120 L40,100 L45,80 L55,65 Z" />
        {/* Greenland */}
        <path d="M290,25 L320,20 L350,25 L370,40 L365,60 L350,75 L325,80 L300,70 L285,50 L290,35 Z" />
        {/* Central America & Caribbean */}
        <path d="M140,190 L160,185 L175,195 L185,210 L180,225 L165,235 L150,230 L140,215 L145,200 Z" />
        {/* South America */}
        <path d="M170,250 L195,240 L220,245 L240,255 L255,275 L260,300 L255,330 L245,360 L225,390 L200,410 L175,415 L155,400 L145,370 L150,340 L145,310 L155,280 L165,260 Z" />
        
        {/* Europe */}
        <path d="M420,60 L450,50 L480,55 L510,50 L540,60 L560,75 L550,95 L570,110 L555,125 L535,130 L515,125 L495,135 L475,130 L455,140 L435,135 L420,125 L410,105 L420,85 Z" />
        {/* UK & Ireland */}
        <path d="M395,75 L410,70 L420,80 L415,95 L400,100 L390,90 Z" />
        {/* Scandinavia */}
        <path d="M470,30 L490,20 L510,25 L525,40 L520,60 L505,70 L485,65 L470,50 Z" />
        
        {/* Africa */}
        <path d="M445,155 L480,150 L515,155 L545,170 L565,195 L575,230 L570,270 L555,310 L530,345 L495,370 L455,375 L420,360 L400,330 L395,290 L405,250 L420,210 L435,180 Z" />
        
        {/* Middle East */}
        <path d="M560,135 L590,130 L620,140 L640,160 L635,185 L615,200 L585,195 L565,175 L555,155 Z" />
        
        {/* Russia/Northern Asia */}
        <path d="M550,45 L600,35 L660,30 L720,35 L780,40 L840,35 L890,45 L920,60 L915,85 L895,100 L860,105 L820,100 L780,110 L740,105 L700,115 L660,110 L620,100 L580,95 L555,80 L545,60 Z" />
        
        {/* China/East Asia */}
        <path d="M720,120 L770,115 L820,125 L860,140 L885,165 L880,195 L855,220 L815,235 L770,230 L730,215 L705,190 L700,160 L710,135 Z" />
        {/* Japan */}
        <path d="M895,140 L915,135 L930,150 L925,175 L905,190 L885,185 L880,165 L890,150 Z" />
        {/* Korean Peninsula */}
        <path d="M860,145 L875,140 L885,155 L880,175 L865,180 L855,165 Z" />
        
        {/* India */}
        <path d="M660,175 L700,170 L730,190 L740,225 L725,265 L695,290 L660,285 L640,255 L645,220 L655,195 Z" />
        {/* Southeast Asia */}
        <path d="M755,245 L790,240 L820,255 L835,285 L825,315 L795,330 L760,320 L745,290 L750,265 Z" />
        
        {/* Indonesia */}
        <path d="M780,340 L820,335 L860,345 L890,360 L880,380 L845,385 L805,375 L775,360 Z" />
        
        {/* Australia */}
        <path d="M820,400 L870,390 L920,400 L960,420 L970,455 L950,485 L900,495 L850,485 L815,460 L810,430 Z" />
        {/* New Zealand */}
        <path d="M975,475 L990,470 L1000,485 L995,500 L980,500 L970,490 Z" />
      </g>
      
      {/* Currency markers with glow */}
      <g filter="url(#glow)">
        {/* USD - New York */}
        <circle cx="195" cy="130" r="8" fill="#22c55e" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="195" y="118" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#22c55e">$</text>
        
        {/* EUR - Frankfurt */}
        <circle cx="475" cy="95" r="8" fill="#3b82f6" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="0.5s" />
        </circle>
        <text x="475" y="83" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#3b82f6">€</text>
        
        {/* GBP - London */}
        <circle cx="410" cy="85" r="8" fill="#8b5cf6" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="0.75s" />
        </circle>
        <text x="410" y="73" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#8b5cf6">£</text>
        
        {/* JPY - Tokyo */}
        <circle cx="905" cy="165" r="8" fill="#ef4444" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="1s" />
        </circle>
        <text x="905" y="153" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ef4444">¥</text>
        
        {/* CNY - Shanghai */}
        <circle cx="830" cy="185" r="8" fill="#f97316" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="1.25s" />
        </circle>
        <text x="830" y="173" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f97316">¥</text>
        
        {/* BRL - Sao Paulo */}
        <circle cx="220" cy="355" r="8" fill="#f59e0b" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="1.5s" />
        </circle>
        <text x="220" y="343" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#f59e0b">R$</text>
        
        {/* NGN - Lagos */}
        <circle cx="455" cy="255" r="8" fill="#06b6d4" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="1.75s" />
        </circle>
        <text x="455" y="243" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#06b6d4">₦</text>
        
        {/* INR - Mumbai */}
        <circle cx="680" cy="230" r="8" fill="#ec4899" opacity="0.9">
          <animate attributeName="r" values="8;11;8" dur="2s" repeatCount="indefinite" begin="2s" />
        </circle>
        <text x="680" y="218" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#ec4899">₹</text>
      </g>
      
      {/* Connection lines */}
      <g strokeWidth="1.5" fill="none" opacity="0.5">
        <path d="M200,130 Q340,80 465,95" stroke="#22c55e">
          <animate attributeName="stroke-dasharray" values="0,400;250,400" dur="3s" repeatCount="indefinite" />
        </path>
        <path d="M485,95 Q650,100 820,185" stroke="#3b82f6">
          <animate attributeName="stroke-dasharray" values="0,400;300,400" dur="3.5s" repeatCount="indefinite" begin="0.5s" />
        </path>
        <path d="M415,85 Q450,90 465,95" stroke="#8b5cf6">
          <animate attributeName="stroke-dasharray" values="0,100;50,100" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
        </path>
        <path d="M840,185 Q870,175 895,165" stroke="#f97316">
          <animate attributeName="stroke-dasharray" values="0,100;60,100" dur="2s" repeatCount="indefinite" begin="1s" />
        </path>
        <path d="M225,350 Q320,280 445,255" stroke="#f59e0b">
          <animate attributeName="stroke-dasharray" values="0,300;200,300" dur="3s" repeatCount="indefinite" begin="1.25s" />
        </path>
        <path d="M465,255 Q550,240 670,230" stroke="#06b6d4">
          <animate attributeName="stroke-dasharray" values="0,250;180,250" dur="2.5s" repeatCount="indefinite" begin="1.5s" />
        </path>
        <path d="M690,230 Q760,200 820,185" stroke="#ec4899">
          <animate attributeName="stroke-dasharray" values="0,200;150,200" dur="2s" repeatCount="indefinite" begin="1.75s" />
        </path>
      </g>
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
        <Label htmlFor="company">Company Name</Label>
        <Input 
          id="company" 
          placeholder="Your company name"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="useCase">Use Case</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select your use case" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remittance">Remittance / Cross-border Payments</SelectItem>
            <SelectItem value="crypto">Crypto On/Off-Ramp Operations</SelectItem>
            <SelectItem value="import-export">Import / Export Trade</SelectItem>
            <SelectItem value="media-spend">Foreign Media Spend / Affiliates</SelectItem>
            <SelectItem value="treasury">Treasury / Internal FX Management</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">Monthly FX Volume</Label>
        <Select value={formData.volumeBand} onValueChange={(value) => setFormData({ ...formData, volumeBand: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select volume band" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under-100k">Under $100K</SelectItem>
            <SelectItem value="100k-500k">$100K - $500K</SelectItem>
            <SelectItem value="500k-1m">$500K - $1M</SelectItem>
            <SelectItem value="1m-5m">$1M - $5M</SelectItem>
            <SelectItem value="over-5m">Over $5M</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="email">Work Email</Label>
        <Input 
          id="email" 
          type="email"
          placeholder="you@company.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        Request Sandbox Access
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
              See example flow <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title} - Example Flow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">1</div>
                <div>
                  <p className="font-medium">Detect Exposure</p>
                  <p className="text-sm text-muted-foreground">{example.split('→')[0]}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">2</div>
                <div>
                  <p className="font-medium">Request Quote</p>
                  <p className="text-sm text-muted-foreground">Call the Hedgi API to get a real-time hedge quote</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">3</div>
                <div>
                  <p className="font-medium">Lock Rate</p>
                  <p className="text-sm text-muted-foreground">Execute the hedge to lock in your rate</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">4</div>
                <div>
                  <p className="font-medium">Track & Reconcile</p>
                  <p className="text-sm text-muted-foreground">Receive webhooks and access reports for settlement</p>
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
              {t("For Companies")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {t("Coming Soon")}
            </p>
            
            <div className="border-t pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  {t("Developer Access")}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={t("Enter developer password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline">
                    {t("Access")}
                  </Button>
                </div>
                {showError && (
                  <p className="text-sm text-red-500">{t("Incorrect password")}</p>
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
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                  Every cross-border transaction is a potential FX liability.
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Hedgi is a Currency Hedging API for teams that want to embed hedging in their product or hedge internal FX exposure — with developer-first REST endpoints and interactive docs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        Request Sandbox Access
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request Sandbox Access</DialogTitle>
                      </DialogHeader>
                      <SandboxRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      View Docs <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Works with your existing payout/settlement flows
                </p>
              </div>
              <div className="space-y-6">
                <CodeSnippet />
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span>Exposure</span>
                  </div>
                  <ArrowRight className="w-4 h-4" />
                  <span>Simulate</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>Quote</span>
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
                <p className="text-2xl md:text-3xl font-bold text-foreground">$9 trillion</p>
                <p className="text-sm text-muted-foreground">Daily FX market volume</p>
              </div>
              <div className="hidden md:block w-px h-12 bg-border" />
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">~$1 quadrillion</p>
                <p className="text-sm text-muted-foreground">Cross-border payments and crypto in 2024</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
                Global Currency Flow Network
              </h2>
              <p className="text-muted-foreground">
                Real-time hedging across major currency corridors
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
                Hedging infrastructure you can call.
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to integrate currency hedging into your product, accessible via REST API.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Get Hedge Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Price an exposure programmatically with real-time market rates.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Lock Rates & Execute</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Convert quotes to hedges and lock in your rates instantly.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Track Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Monitor what's open vs hedged with complete exposure visibility.</p>
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
                  <p className="text-sm text-muted-foreground">Receive lifecycle events and status updates directly into your system.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Reporting & Exports</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Generate finance-ready summaries and audit-compliant reports.</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Interactive Docs</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Try endpoints live in our Swagger-style documentation.</p>
                  <Button variant="ghost" size="sm" className="mt-3 px-0 text-primary hover:text-primary/80" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      Explore docs <ExternalLink className="w-4 h-4" />
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
                Built for your use case
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Whether you're building a product or managing treasury, Hedgi adapts to your workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              <SolutionCard
                icon={Building2}
                title="Remittance Firms"
                pain="Currency volatility between quote and settlement erodes margins on cross-border transfers."
                outcome="Offer locked FX rates at checkout and protect your margin on every transfer."
                example="Customer initiates transfer → Quote rate locked → Settlement processed → Margin protected"
              />

              <SolutionCard
                icon={Bitcoin}
                title="Crypto Firms"
                pain="Settlement timing gaps and treasury conversions create unhedged FX exposure."
                outcome="Hedge FX exposure created by on/off-ramp operations and treasury management."
                example="User on-ramps fiat → FX exposure detected → Hedge executed → Settlement complete"
              />

              <SolutionCard
                icon={Ship}
                title="Import / Export Companies"
                pain="Long payment cycles from PO to shipment to payment leave margin vulnerable to FX moves."
                outcome="Protect margin on payables and receivables throughout the trade cycle."
                example="PO created → Exposure identified → Hedge locked → Invoice settled at protected rate"
              />

              <SolutionCard
                icon={Target}
                title="Affiliate & Performance Marketers"
                pain="Foreign media spend in multiple currencies makes CAC/ROAS unpredictable."
                outcome="Stabilize customer acquisition costs by hedging forecasted spend currency."
                example="Budget allocated → Currency exposure forecasted → Hedge locked → Spend executed at known rate"
              />
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                How it works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four simple steps to protect your FX exposure
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">Detect Exposure</h3>
                  <p className="text-sm text-muted-foreground">Identify FX exposure in your transactions or treasury</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">Request Quote</h3>
                  <p className="text-sm text-muted-foreground">Call the API to get a real-time hedge quote</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">Lock & Execute</h3>
                  <p className="text-sm text-muted-foreground">Convert the quote to a hedge and lock your rate</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold mb-2">Track & Reconcile</h3>
                  <p className="text-sm text-muted-foreground">Receive webhooks and generate reports</p>
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
                  Built for financial workflows
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Enterprise-grade security and reliability for your hedging operations
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">API Key Authentication</h3>
                    <p className="text-sm text-muted-foreground">Secure access with least-privilege API keys</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Idempotency Support</h3>
                    <p className="text-sm text-muted-foreground">Safe retries with idempotency keys and rate limits</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Webhook className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Signed Webhooks</h3>
                    <p className="text-sm text-muted-foreground">Cryptographically signed webhook payloads</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-background rounded-lg border">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Audit Logs</h3>
                    <p className="text-sm text-muted-foreground">Complete audit trail for compliance requirements</p>
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
                Become a launch design partner
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join our early access program and help shape the future of programmatic FX hedging.
              </p>

              <Card className="p-6 md:p-8">
                <SandboxRequestForm />
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground mb-4">Or explore our documentation first:</p>
                  <Button variant="outline" size="lg" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      View API Docs <ExternalLink className="w-4 h-4" />
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
                <span className="text-sm text-muted-foreground">Currency Hedging API</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <a href="/about-us" className="hover:text-foreground transition-colors">About</a>
                <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">API Docs</a>
                <a href="mailto:contact@hedgi.ai" className="hover:text-foreground transition-colors">Contact</a>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
              <p>&copy; {new Date().getFullYear()} Hedgi. All rights reserved.</p>
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
