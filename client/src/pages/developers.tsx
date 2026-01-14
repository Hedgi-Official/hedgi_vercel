import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useState } from "react";
import { 
  Code2, 
  Zap, 
  Shield, 
  Globe,
  Terminal,
  Copy,
  Check,
  ArrowRight,
  Clock,
  TrendingUp,
  Activity,
  Lock,
  FileCode,
  Webhook,
  Server,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Layers,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Key,
  Send,
  Eye
} from "lucide-react";
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

const CodePlayground = () => {
  const [activeTab, setActiveTab] = useState("nodejs");
  const [copied, setCopied] = useState(false);
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const [selectedDirection, setSelectedDirection] = useState("buy");

  const codeExamples: Record<string, string> = {
    nodejs: `// Create a currency hedge order with the Hedgi REST API
const apiKey = process.env.HEDGI_API_KEY;

const response = await fetch("https://api.hedgi.ai/api/orders", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${apiKey}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    symbol: "${selectedPair}",
    direction: "${selectedDirection}",
    volume: 0.1,
    duration_days: 7
  })
});

const order = await response.json();
console.log(\`Order created: \${order.order_id}\`);
console.log(\`Entry price: \${order.entry_price}\`);
console.log(\`Status: \${order.status}\`);`,

    python: `import requests
import os

# Create a currency hedge order with the Hedgi REST API
api_key = os.environ["HEDGI_API_KEY"]

response = requests.post(
    "https://api.hedgi.ai/api/orders",
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json={
        "symbol": "${selectedPair}",
        "direction": "${selectedDirection}",
        "volume": 0.1,
        "duration_days": 7
    }
)

order = response.json()
print(f"Order created: {order['order_id']}")
print(f"Entry price: {order['entry_price']}")
print(f"Status: {order['status']}")`,

    curl: `# Create a currency hedge order with the Hedgi REST API
curl -X POST https://api.hedgi.ai/api/orders \\
  -H "Authorization: Bearer $HEDGI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "${selectedPair}",
    "direction": "${selectedDirection}",
    "volume": 0.1,
    "duration_days": 7
  }'

# Response:
# {
#   "order_id": "ord_abc123",
#   "symbol": "${selectedPair}",
#   "entry_price": 5.1234,
#   "status": "active"
# }`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border bg-zinc-950 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-zinc-500 text-sm font-mono">create-hedge.{activeTab === 'curl' ? 'sh' : activeTab === 'python' ? 'py' : 'ts'}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCopy}
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      
      <div className="flex border-b border-zinc-800">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-0 p-0 h-auto rounded-none">
            <TabsTrigger 
              value="nodejs" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent text-zinc-400 data-[state=active]:text-white px-4 py-2.5"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Node.js
            </TabsTrigger>
            <TabsTrigger 
              value="python"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent text-zinc-400 data-[state=active]:text-white px-4 py-2.5"
            >
              <Code2 className="w-4 h-4 mr-2" />
              Python
            </TabsTrigger>
            <TabsTrigger 
              value="curl"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent text-zinc-400 data-[state=active]:text-white px-4 py-2.5"
            >
              <FileCode className="w-4 h-4 mr-2" />
              cURL
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex gap-3 px-4 py-3 bg-zinc-900/30 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Pair:</span>
          <select 
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-primary"
          >
            <option value="USDBRL">USD/BRL</option>
            <option value="EURUSD">EUR/USD</option>
            <option value="USDMXN">USD/MXN</option>
            <option value="BRLCNY">BRL/CNY (Synthetic)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Direction:</span>
          <select 
            value={selectedDirection}
            onChange={(e) => setSelectedDirection(e.target.value)}
            className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-primary"
          >
            <option value="buy">Buy (Long)</option>
            <option value="sell">Sell (Short)</option>
          </select>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono leading-relaxed">
          <code className="text-zinc-300">
            {codeExamples[activeTab].split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="text-zinc-600 select-none w-8 text-right pr-4">{i + 1}</span>
                <span dangerouslySetInnerHTML={{ 
                  __html: line
                    .replace(/(const|let|var|import|from|require|await|async|print|curl|export)/g, '<span class="text-purple-400">$1</span>')
                    .replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-green-400">$1</span>')
                    .replace(/\b(true|false|null|undefined|None)\b/g, '<span class="text-yellow-400">$1</span>')
                    .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-yellow-400">$1</span>')
                    .replace(/(\/\/.*|#.*)/g, '<span class="text-zinc-500">$1</span>')
                    .replace(/(-H|-X|-d)/g, '<span class="text-cyan-400">$1</span>')
                }} />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

const SandboxRequestForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    useCase: '',
    expectedVolume: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      console.log('Sandbox request:', formData);
    }, 1500);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Request Received</h3>
        <p className="text-muted-foreground">
          We'll send your sandbox credentials to your email within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            placeholder="Jane Smith"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="company">Company</Label>
          <Input 
            id="company" 
            placeholder="Acme Inc."
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email">Work Email</Label>
        <Input 
          id="email" 
          type="email"
          placeholder="jane@company.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="useCase">Primary Use Case</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select your use case" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cross-border-payments">Cross-border Payments</SelectItem>
            <SelectItem value="treasury-management">Treasury Management</SelectItem>
            <SelectItem value="import-export">Import/Export Trade</SelectItem>
            <SelectItem value="crypto-offramp">Crypto Off-ramp</SelectItem>
            <SelectItem value="remittance">Remittance Platform</SelectItem>
            <SelectItem value="saas-international">International SaaS</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">Expected Monthly Volume (USD)</Label>
        <Select value={formData.expectedVolume} onValueChange={(value) => setFormData({ ...formData, expectedVolume: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select volume range" />
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
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Key className="w-4 h-4 mr-2" />
            Request Sandbox Access
          </>
        )}
      </Button>
    </form>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
  <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
    <CardContent className="pt-6">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const QuickStartStep = ({ number, title, description, code }: { number: number; title: string; description: string; code?: string }) => (
  <div className="flex gap-4">
    <div className="flex-shrink-0">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
        {number}
      </div>
    </div>
    <div className="flex-1 pb-8 border-l border-border pl-6 ml-[-20px] last:border-0">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      {code && (
        <div className="bg-zinc-900 rounded-lg p-3 font-mono text-sm text-zinc-300">
          <code>{code}</code>
        </div>
      )}
    </div>
  </div>
);

export default function Developers() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="page-container bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      
      <main className="page-main">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Built for developers who ship
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight">
                Currency hedging.
                <br />
                <span className="text-primary">One API call away.</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Protect your international transactions from FX volatility with a simple, 
                powerful API. Real-time rates, instant execution, enterprise-grade security.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="text-base">
                      <Key className="w-5 h-5 mr-2" />
                      Get API Keys
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Sandbox Access</DialogTitle>
                    </DialogHeader>
                    <SandboxRequestForm />
                  </DialogContent>
                </Dialog>
                
                <Button size="lg" variant="outline" className="text-base" asChild>
                  <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Read the Docs
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto">
              <CodePlayground />
            </div>
          </div>
        </section>

        {/* Feature Rail */}
        <section className="py-16 border-y bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">&lt;5 min</div>
                <div className="text-sm text-muted-foreground">Integration time</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime SLA</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">50ms</div>
                <div className="text-sm text-muted-foreground">Avg. response time</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Developer support</div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Get started in minutes</h2>
                <p className="text-muted-foreground text-lg">
                  Three simple steps to protect your first transaction
                </p>
              </div>
              
              <div className="space-y-0">
                <QuickStartStep 
                  number={1}
                  title="Get your API key"
                  description="Sign up for a sandbox account and receive your API credentials instantly via email."
                  code="export HEDGI_API_KEY=sk_sandbox_..."
                />
                <QuickStartStep 
                  number={2}
                  title="Create your first hedge"
                  description="Use our REST API to create a hedge order. Specify your currency pair, direction, volume, and duration."
                  code='curl -X POST https://api.hedgi.ai/api/orders -H "Authorization: Bearer $HEDGI_API_KEY"'
                />
                <QuickStartStep 
                  number={3}
                  title="Monitor and manage"
                  description="Track your positions in real-time, receive webhook notifications, and close hedges when ready."
                  code="GET https://api.hedgi.ai/api/trades/{order_id}/status"
                />
              </div>
            </div>
          </div>
        </section>

        {/* API Capabilities */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to hedge</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                A complete API for the full hedging lifecycle—from quote to reconciliation
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard 
                icon={TrendingUp}
                title="Real-time Quotes"
                description="Live bid/ask rates from multiple liquidity providers with sub-second updates."
              />
              <FeatureCard 
                icon={Send}
                title="Instant Execution"
                description="Create hedges in milliseconds with guaranteed execution at quoted prices."
              />
              <FeatureCard 
                icon={Eye}
                title="Position Monitoring"
                description="Track P&L, margin, and status of all positions in real-time via API or webhooks."
              />
              <FeatureCard 
                icon={BarChart3}
                title="Analytics & Reports"
                description="Detailed transaction history, performance metrics, and exportable reports."
              />
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="w-5 h-5 text-primary" />
                    Supported Pairs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {['USD/BRL', 'EUR/USD', 'USD/MXN', 'BRL/CNY', 'EUR/BRL'].map((pair) => (
                      <span key={pair} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {pair}
                      </span>
                    ))}
                    <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                      + more
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Server className="w-5 h-5 text-primary" />
                    Liquidity Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['ActivTrades', 'Tickmill', 'FBS'].map((broker) => (
                      <div key={broker} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm">{broker}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Layers className="w-5 h-5 text-primary" />
                    Synthetic Pairs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Hedge exotic pairs through intelligent routing
                  </p>
                  <div className="text-sm font-mono bg-muted rounded p-2">
                    BRL → USD → CNY
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SDK & Integrations */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">SDKs & Integrations</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Official libraries and tools to accelerate your integration
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="group hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Terminal className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Node.js SDK</h3>
                      <span className="text-xs text-muted-foreground">TypeScript support included</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Official SDK with full TypeScript support — coming Q1 2026</p>
                </CardContent>
              </Card>

              <Card className="group hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium">Coming Soon</span>
                </div>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Code2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Python SDK</h3>
                      <span className="text-xs text-muted-foreground">Async support included</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Official SDK with async support — coming Q1 2026</p>
                </CardContent>
              </Card>

              <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Webhook className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Webhooks</h3>
                      <span className="text-xs text-muted-foreground">Real-time events</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Instant notifications for order updates</p>
                </CardContent>
              </Card>

              <Card className="group hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <FileCode className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">REST API</h3>
                      <span className="text-xs text-muted-foreground">api.hedgi.ai</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">OpenAPI spec with full documentation</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Enterprise-grade security</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Built with security and compliance at its core
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">TLS 1.3 Encryption</h3>
                    <p className="text-sm text-muted-foreground">All data encrypted in transit with modern protocols</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">API Key Rotation</h3>
                    <p className="text-sm text-muted-foreground">Rotate keys without downtime via dashboard</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Rate Limiting</h3>
                    <p className="text-sm text-muted-foreground">Intelligent rate limiting to prevent abuse</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Audit Logging</h3>
                    <p className="text-sm text-muted-foreground">Complete audit trail of all API operations</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Regional Compliance</h3>
                    <p className="text-sm text-muted-foreground">LGPD compliant with data residency options</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">SOC 2 Type II</h3>
                    <p className="text-sm text-muted-foreground">Certification in progress</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to start building?</h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Get your sandbox API keys and start integrating in minutes. 
                Our team is here to help you every step of the way.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="text-base">
                      <Key className="w-5 h-5 mr-2" />
                      Get Sandbox Access
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Sandbox Access</DialogTitle>
                    </DialogHeader>
                    <SandboxRequestForm />
                  </DialogContent>
                </Dialog>
                
                <Button size="lg" variant="outline" className="text-base" asChild>
                  <a href="mailto:developers@hedgi.ai">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Talk to an Engineer
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <a 
                  href="https://api.hedgi.ai/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="text-sm">Documentation</span>
                </a>
                <a 
                  href="https://status.hedgi.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-sm">Status Page</span>
                </a>
                <a 
                  href="https://api.hedgi.ai/changelog" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Changelog</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
