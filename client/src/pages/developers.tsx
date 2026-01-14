import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  Shield, 
  Copy,
  Check,
  ArrowRight,
  Clock,
  Lock,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Zap,
  Activity,
  Globe,
  Headphones,
  FileText,
  Play
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

const CodeBlock = ({ 
  code, 
  language,
  showLineNumbers = true 
}: { 
  code: string; 
  language: string;
  showLineNumbers?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <button 
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="bg-zinc-950 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code className="text-zinc-300">
          {code.split('\n').map((line, i) => (
            <div key={i} className="flex">
              {showLineNumbers && (
                <span className="text-zinc-600 select-none w-8 text-right pr-4">{i + 1}</span>
              )}
              <span dangerouslySetInnerHTML={{ 
                __html: line
                  .replace(/(const|let|var|import|from|require|await|async|export|def|return)/g, '<span class="text-purple-400">$1</span>')
                  .replace(/(".*?"|'.*?')/g, '<span class="text-emerald-400">$1</span>')
                  .replace(/\b(true|false|null|undefined|None)\b/g, '<span class="text-amber-400">$1</span>')
                  .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')
                  .replace(/(\/\/.*|#.*)/g, '<span class="text-zinc-500">$1</span>')
                  .replace(/(curl|-H|-X|-d)/g, '<span class="text-cyan-400">$1</span>')
              }} />
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

const APIPlayground = () => {
  const [activeLanguage, setActiveLanguage] = useState("curl");
  const [activeView, setActiveView] = useState<"request" | "response">("request");
  const [selectedPair, setSelectedPair] = useState("USDBRL");
  const [selectedDirection, setSelectedDirection] = useState("buy");

  const getRequestExamples = (pair: string, direction: string): Record<string, string> => ({
    curl: `curl -X POST https://api.hedgi.ai/v1/hedges \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "currency_pair": "${pair}",
    "amount": 10000,
    "direction": "${direction}",
    "duration_days": 30
  }'`,
    nodejs: `const response = await fetch("https://api.hedgi.ai/v1/hedges", {
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_live_...",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    currency_pair: "${pair}",
    amount: 10000,
    direction: "${direction}",
    duration_days: 30
  })
});

const hedge = await response.json();`,
    python: `import requests

response = requests.post(
    "https://api.hedgi.ai/v1/hedges",
    headers={
        "Authorization": "Bearer sk_live_...",
        "Content-Type": "application/json"
    },
    json={
        "currency_pair": "${pair}",
        "amount": 10000,
        "direction": "${direction}",
        "duration_days": 30
    }
)

hedge = response.json()`
  });

  const requestExamples = getRequestExamples(selectedPair, selectedDirection);

  const responseExample = `{
  "id": "hdg_1a2b3c4d5e",
  "object": "hedge",
  "currency_pair": "${selectedPair}",
  "amount": 10000,
  "direction": "${selectedDirection}",
  "entry_rate": 4.9234,
  "duration_days": 30,
  "expires_at": "2026-02-14T00:00:00Z",
  "status": "active",
  "created_at": "2026-01-14T12:00:00Z"
}`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">POST</span>
            <span className="text-zinc-400 text-sm font-mono">/v1/hedges</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>200 OK</span>
        </div>
      </div>
      
      <div className="flex border-b border-zinc-800">
        <button
          onClick={() => setActiveView("request")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeView === "request" 
              ? "text-white border-b-2 border-primary" 
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Request
        </button>
        <button
          onClick={() => setActiveView("response")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${
            activeView === "response" 
              ? "text-white border-b-2 border-primary" 
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Response
        </button>
      </div>

      {activeView === "request" && (
        <>
          <div className="flex border-b border-zinc-800">
            {["curl", "nodejs", "python"].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveLanguage(lang)}
                className={`px-4 py-2 text-xs font-medium transition-colors ${
                  activeLanguage === lang 
                    ? "text-white bg-zinc-800" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                {lang === "nodejs" ? "Node.js" : lang === "python" ? "Python" : "cURL"}
              </button>
            ))}
          </div>
          <div className="flex gap-4 px-4 py-2.5 bg-zinc-900/30 border-b border-zinc-800">
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
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Direction:</span>
              <select 
                value={selectedDirection}
                onChange={(e) => setSelectedDirection(e.target.value)}
                className="bg-zinc-800 text-zinc-300 text-xs rounded px-2 py-1 border border-zinc-700 focus:outline-none focus:border-primary"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="p-4">
        <CodeBlock 
          code={activeView === "request" ? requestExamples[activeLanguage] : responseExample}
          language={activeView === "request" ? activeLanguage : "json"}
        />
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

const StickyNav = ({ activeSection }: { activeSection: string }) => {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "quickstart", label: "Quick start" },
    { id: "api", label: "API" },
    { id: "security", label: "Security" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-8 py-3">
          <span className="font-semibold text-sm">Developers</span>
          <div className="flex items-center gap-6">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`text-sm transition-colors ${
                  activeSection === section.id 
                    ? "text-primary font-medium" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default function Developers() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["overview", "quickstart", "api", "security"];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100 && rect.bottom > 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      <StickyNav activeSection={activeSection} />
      
      <main>
        {/* Hero Section */}
        <section id="overview" className="py-24 md:py-32">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  API Status: All systems operational
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                  Hedge currency risk with one API
                </h1>
                
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Protect international transactions from FX volatility. Get real-time rates, execute instantly, and monitor positions—all through a simple REST API.
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <Dialog open={isSandboxOpen} onOpenChange={setIsSandboxOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="font-medium">
                        Get API keys
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request sandbox access</DialogTitle>
                      </DialogHeader>
                      <SandboxForm onClose={() => setIsSandboxOpen(false)} />
                    </DialogContent>
                  </Dialog>
                  
                  <Button size="lg" variant="outline" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View docs
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                  
                  <Button size="lg" variant="ghost" asChild>
                    <a href="mailto:developers@hedgi.ai">
                      <Headphones className="w-4 h-4 mr-2" />
                      Talk to an engineer
                    </a>
                  </Button>
                </div>

                <div className="flex items-center gap-8 mt-12 pt-8 border-t">
                  <div>
                    <div className="text-2xl font-bold">99.9%</div>
                    <div className="text-sm text-muted-foreground">Uptime SLA</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div>
                    <div className="text-2xl font-bold">&lt;50ms</div>
                    <div className="text-sm text-muted-foreground">Response time</div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div>
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                </div>
              </div>

              <div className="hidden lg:block">
                <APIPlayground />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Start Section */}
        <section id="quickstart" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Start building in minutes
                </h2>
                <p className="text-lg text-muted-foreground">
                  Follow these three steps to create your first hedge
                </p>
              </div>

              <div className="space-y-12">
                {/* Step 1 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Get your API key</h3>
                    <p className="text-muted-foreground mb-4">
                      Request sandbox access and receive your test credentials via email. Production keys are available after verification.
                    </p>
                    <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm">
                      <span className="text-zinc-500"># Set your API key as an environment variable</span>
                      <br />
                      <span className="text-purple-400">export</span> <span className="text-zinc-300">HEDGI_API_KEY=</span><span className="text-emerald-400">"sk_sandbox_..."</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Create a hedge</h3>
                    <p className="text-muted-foreground mb-4">
                      Make a POST request to create a hedge. Specify the currency pair, amount, direction, and duration.
                    </p>
                    <CodeBlock 
                      code={`curl -X POST https://api.hedgi.ai/v1/hedges \\
  -H "Authorization: Bearer $HEDGI_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"currency_pair": "USDBRL", "amount": 10000, "direction": "buy", "duration_days": 30}'`}
                      language="bash"
                      showLineNumbers={false}
                    />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">Monitor your position</h3>
                    <p className="text-muted-foreground mb-4">
                      Check the status of your hedge at any time. Set up webhooks for real-time notifications.
                    </p>
                    <CodeBlock 
                      code={`curl https://api.hedgi.ai/v1/hedges/hdg_1a2b3c4d5e \\
  -H "Authorization: Bearer $HEDGI_API_KEY"

# Response: {"id": "hdg_1a2b3c4d5e", "status": "active", "pnl": 234.56, ...}`}
                      language="bash"
                      showLineNumbers={false}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-16 text-center">
                <Button size="lg" variant="outline" asChild>
                  <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read full documentation
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* API Capabilities */}
        <section id="api" className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Complete hedging infrastructure
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need for the full hedge lifecycle
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Real-time rates</h3>
                <p className="text-muted-foreground">
                  Live bid/ask quotes from multiple liquidity sources with sub-second updates.
                </p>
              </div>

              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Instant execution</h3>
                <p className="text-muted-foreground">
                  Create hedges in milliseconds with guaranteed execution at quoted prices.
                </p>
              </div>

              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Position monitoring</h3>
                <p className="text-muted-foreground">
                  Track P&L, margin, and status in real-time via API or webhooks.
                </p>
              </div>

              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Multi-currency</h3>
                <p className="text-muted-foreground">
                  Support for USD/BRL, EUR/USD, USD/MXN, and more emerging market pairs.
                </p>
              </div>

              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Webhooks</h3>
                <p className="text-muted-foreground">
                  Receive real-time notifications for position updates and expirations.
                </p>
              </div>

              <div className="group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flexible durations</h3>
                <p className="text-muted-foreground">
                  Hedge for 1 day to 12 months. Close early anytime with no penalties.
                </p>
              </div>
            </div>

            {/* Mobile API Playground */}
            <div className="lg:hidden mt-16 max-w-2xl mx-auto">
              <APIPlayground />
            </div>
          </div>
        </section>

        {/* Security & Trust Section */}
        <section id="security" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Built for enterprise
                </h2>
                <p className="text-lg text-muted-foreground">
                  Security and reliability you can trust
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <Card className="bg-card border-border/50">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Shield className="w-6 h-6 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Secure by design</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        TLS 1.3 encryption
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        API key authentication
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        Request signing available
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                      <Lock className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Compliance ready</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-500" />
                        SOC 2 Type II (in progress)
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-500" />
                        GDPR compliant
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-500" />
                        Audit logs
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border/50">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                      <Headphones className="w-6 h-6 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Developer support</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-500" />
                        24/7 technical support
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-500" />
                        Dedicated slack channel
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-purple-500" />
                        Integration assistance
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to get started?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Request sandbox access and start building today. Our team is here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Dialog open={isSandboxOpen} onOpenChange={setIsSandboxOpen}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="font-medium">
                      Get API keys
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request sandbox access</DialogTitle>
                    </DialogHeader>
                    <SandboxForm />
                  </DialogContent>
                </Dialog>
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:developers@hedgi.ai">
                    <Headphones className="w-4 h-4 mr-2" />
                    Talk to an engineer
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
