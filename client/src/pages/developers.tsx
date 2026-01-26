import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Shield, 
  Copy,
  Check,
  ArrowRight,
  Lock,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Zap,
  Activity,
  Globe,
  Headphones,
  Terminal
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const HedgeLifecycleStage = ({ 
  stage, 
  isActive, 
  isComplete,
  onClick,
  title,
  subtitle 
}: { 
  stage: number;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) => (
  <button 
    onClick={onClick}
    className={`flex-1 text-left p-6 rounded-xl border-2 transition-all ${
      isActive 
        ? 'border-primary bg-primary/5' 
        : isComplete 
          ? 'border-emerald-500/50 bg-emerald-500/5' 
          : 'border-border hover:border-primary/30'
    }`}
  >
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : isComplete 
            ? 'bg-emerald-500 text-white' 
            : 'bg-muted text-muted-foreground'
      }`}>
        {isComplete ? <Check className="w-4 h-4" /> : stage}
      </div>
      <span className={`text-xs uppercase tracking-wider ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
        {isActive ? 'Current' : isComplete ? 'Complete' : 'Next'}
      </span>
    </div>
    <h3 className={`font-semibold mb-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </button>
);

const LiveConsole = ({ stage, pair, direction }: { stage: number; pair: string; direction: string }) => {
  const [copied, setCopied] = useState(false);
  
  const stageData = {
    1: {
      method: 'POST',
      endpoint: '/v1/hedges',
      request: `{
  "currency_pair": "${pair}",
  "amount": 50000,
  "direction": "${direction}",
  "duration_days": 30
}`,
      response: `{
  "id": "hdg_7x9k2m4n",
  "status": "active",
  "currency_pair": "${pair}",
  "amount": 50000,
  "entry_rate": 4.9847,
  "protected_value": 248235.00,
  "expires_at": "2026-02-14T00:00:00Z"
}`
    },
    2: {
      method: 'GET',
      endpoint: '/v1/hedges/hdg_7x9k2m4n',
      request: null,
      response: `{
  "id": "hdg_7x9k2m4n",
  "status": "active",
  "currency_pair": "${pair}",
  "current_rate": 5.1234,
  "entry_rate": 4.9847,
  "unrealized_pnl": 6935.00,
  "pnl_percent": 2.78,
  "days_remaining": 22
}`
    },
    3: {
      method: 'POST',
      endpoint: '/v1/hedges/hdg_7x9k2m4n/close',
      request: `{
  "reason": "payment_complete"
}`,
      response: `{
  "id": "hdg_7x9k2m4n",
  "status": "closed",
  "final_rate": 5.1234,
  "entry_rate": 4.9847,
  "realized_pnl": 6935.00,
  "settlement": {
    "amount_protected": 50000.00,
    "amount_saved": 6935.00,
    "currency": "BRL"
  }
}`
    }
  };

  const data = stageData[stage as keyof typeof stageData];
  
  const handleCopy = () => {
    const text = data.request 
      ? `curl -X ${data.method} https://api.hedgi.ai${data.endpoint} \\\n  -H "Authorization: Bearer $HEDGI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${data.request.replace(/\n/g, '')}'`
      : `curl https://api.hedgi.ai${data.endpoint} -H "Authorization: Bearer $HEDGI_API_KEY"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-400">Live Console</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy cURL'}
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${
              data.method === 'POST' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {data.method}
            </span>
            <span className="text-zinc-400">{data.endpoint}</span>
          </div>
          
          {data.request && (
            <div className="bg-zinc-900 rounded-lg p-3 text-zinc-300">
              <div className="text-xs text-zinc-500 mb-1">Request body</div>
              <pre className="text-emerald-400 whitespace-pre-wrap">{data.request}</pre>
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-400">200 OK</span>
            <span className="text-xs text-zinc-600">• 43ms</span>
          </div>
          <div className="bg-zinc-900 rounded-lg p-3">
            <pre className="text-zinc-300 whitespace-pre-wrap">{data.response}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

const SandboxForm = ({ onClose }: { onClose?: () => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    useCase: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You're on the list</h3>
        <p className="text-muted-foreground">
          We'll send your sandbox credentials within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm">Name</Label>
          <Input 
            id="name" 
            placeholder="Jane Smith"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="company" className="text-sm">Company</Label>
          <Input 
            id="company" 
            placeholder="Acme Inc."
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email" className="text-sm">Work email</Label>
        <Input 
          id="email" 
          type="email"
          placeholder="jane@company.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="useCase" className="text-sm">What are you building?</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select use case" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payments">Cross-border payments</SelectItem>
            <SelectItem value="treasury">Treasury management</SelectItem>
            <SelectItem value="trade">Import/export trade</SelectItem>
            <SelectItem value="remittance">Remittance platform</SelectItem>
            <SelectItem value="other">Something else</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Get sandbox access"}
      </Button>
    </form>
  );
};

export default function Developers() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [activeStage, setActiveStage] = useState(1);
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const [selectedDirection, setSelectedDirection] = useState("buy");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      
      <main>
        {/* Developer-focused Hero */}
        <section className="py-12 md:py-16 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 text-sm bg-primary/10 px-3 py-1.5 rounded-full mb-6">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-bold text-black">Hedging API</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Lock exchange rates with one API call
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                Create, monitor, and settle currency hedges programmatically. 
                Built for fintechs, payment platforms, and treasury systems.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                  Get API keys
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button size="lg" variant="outline" asChild>
                  <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-4 h-4 mr-2" />
                    API Reference
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
              
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">REST API</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">Webhooks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">Sandbox</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Hedge Lifecycle */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Parameter Controls */}
              <div className="flex justify-center gap-6 mb-8">
                <div className="flex items-center gap-3 bg-background rounded-lg px-4 py-2 border">
                  <span className="text-sm text-muted-foreground">Pair:</span>
                  <select 
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="USDBRL">USD/BRL</option>
                    <option value="EURUSD">EUR/USD</option>
                    <option value="USDMXN">USD/MXN</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-background rounded-lg px-4 py-2 border">
                  <span className="text-sm text-muted-foreground">Direction:</span>
                  <select 
                    value={selectedDirection}
                    onChange={(e) => setSelectedDirection(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="buy">Buy (protect imports)</option>
                    <option value="sell">Sell (protect exports)</option>
                  </select>
                </div>
              </div>

              {/* Lifecycle Stages */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <HedgeLifecycleStage
                  stage={1}
                  isActive={activeStage === 1}
                  isComplete={activeStage > 1}
                  onClick={() => setActiveStage(1)}
                  title="Create hedge"
                  subtitle="Lock in today's rate for future payment"
                />
                <HedgeLifecycleStage
                  stage={2}
                  isActive={activeStage === 2}
                  isComplete={activeStage > 2}
                  onClick={() => setActiveStage(2)}
                  title="Monitor position"
                  subtitle="Track P&L and market movements"
                />
                <HedgeLifecycleStage
                  stage={3}
                  isActive={activeStage === 3}
                  isComplete={false}
                  onClick={() => setActiveStage(3)}
                  title="Settle & close"
                  subtitle="Close position and realize savings"
                />
              </div>

              {/* Live Console */}
              <LiveConsole stage={activeStage} pair={selectedPair} direction={selectedDirection} />
            </div>
          </div>
        </section>

        {/* Build → Operate → Scale */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              {/* Build It */}
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Build it</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">Simple REST API</h3>
                    <p className="text-muted-foreground mb-4">
                      Three core endpoints handle the complete hedge lifecycle. No complex SDKs to install—use any HTTP client.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">POST /v1/hedges</code>
                        <span className="text-muted-foreground">Create a hedge</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">GET /v1/hedges/:id</code>
                        <span className="text-muted-foreground">Check status</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">POST /v1/hedges/:id/close</code>
                        <span className="text-muted-foreground">Close position</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Supported currencies</h3>
                    <p className="text-muted-foreground mb-4">
                      Focus on emerging market pairs where volatility matters most.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {['USD/BRL', 'EUR/BRL', 'USD/MXN', 'EUR/USD', 'BRL/CNY'].map((pair) => (
                        <span key={pair} className="px-3 py-1.5 bg-muted rounded-full text-sm font-mono">
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operate It */}
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Operate it</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">Webhooks</h3>
                    <p className="text-sm text-muted-foreground">
                      Get notified when positions approach expiry, hit P&L thresholds, or require action.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Real-time rates</h3>
                    <p className="text-sm text-muted-foreground">
                      Stream live bid/ask from multiple liquidity sources with sub-second updates.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Position dashboard</h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor all active hedges, aggregate exposure, and P&L via API or our web dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scale It */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold">Scale it</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="p-6 rounded-xl border bg-card">
                    <Shield className="w-6 h-6 text-emerald-500 mb-3" />
                    <h3 className="font-semibold">Enterprise security</h3>
                  </div>
                  <div className="p-6 rounded-xl border bg-card">
                    <Lock className="w-6 h-6 text-blue-500 mb-3" />
                    <h3 className="font-semibold">Compliance ready</h3>
                  </div>
                  <div className="p-6 rounded-xl border bg-card">
                    <Headphones className="w-6 h-6 text-purple-500 mb-3" />
                    <h3 className="font-semibold">Dedicated support</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to eliminate currency risk?
              </h2>
              <p className="text-muted-foreground mb-8">
                Get sandbox access and ship your first hedge today.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                  Get API keys
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:developers@hedgi.ai">
                    Talk to an engineer
                  </a>
                </Button>
              </div>
              
              <div className="flex justify-center gap-8 mt-12 pt-8 border-t">
                <div>
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-sm text-muted-foreground">Uptime SLA</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">&lt;50ms</div>
                  <div className="text-sm text-muted-foreground">Avg response</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm text-muted-foreground">Support</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={isSandboxOpen} onOpenChange={setIsSandboxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request sandbox access</DialogTitle>
          </DialogHeader>
          <SandboxForm onClose={() => setIsSandboxOpen(false)} />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
