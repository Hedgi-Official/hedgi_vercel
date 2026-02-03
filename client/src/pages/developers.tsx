import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  subtitle,
  currentLabel,
  completeLabel,
  nextLabel
}: { 
  stage: number;
  isActive: boolean;
  isComplete: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  currentLabel: string;
  completeLabel: string;
  nextLabel: string;
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
        {isActive ? currentLabel : isComplete ? completeLabel : nextLabel}
      </span>
    </div>
    <h3 className={`font-semibold mb-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </button>
);

const LiveConsole = ({ stage, pair, direction, translations }: { stage: number; pair: string; direction: string; translations: { liveConsole: string; copied: string; copyCurl: string; requestBody: string } }) => {
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
          <span className="text-zinc-400">{translations.liveConsole}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? translations.copied : translations.copyCurl}
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
              <div className="text-xs text-zinc-500 mb-1">{translations.requestBody}</div>
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

interface SandboxFormTranslations {
  formName: string;
  formNamePlaceholder: string;
  formCompany: string;
  formCompanyPlaceholder: string;
  formEmail: string;
  formEmailPlaceholder: string;
  formUseCase: string;
  formUseCasePlaceholder: string;
  formUseCaseCrossBorder: string;
  formUseCaseTreasury: string;
  formUseCaseTrade: string;
  formUseCaseRemittance: string;
  formUseCaseOther: string;
  getSandboxAccess: string;
  submitting: string;
  successTitle: string;
  successMessage: string;
}

const SandboxForm = ({ onClose, translations }: { onClose?: () => void; translations: SandboxFormTranslations }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    useCase: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sandbox-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error('Failed to submit request');
      }
      setSubmitted(true);
    } catch (error) {
      console.error('Sandbox request error:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{translations.successTitle}</h3>
        <p className="text-muted-foreground">
          {translations.successMessage}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm">{translations.formName}</Label>
          <Input 
            id="name" 
            placeholder={translations.formNamePlaceholder}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="company" className="text-sm">{translations.formCompany}</Label>
          <Input 
            id="company" 
            placeholder={translations.formCompanyPlaceholder}
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            required
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email" className="text-sm">{translations.formEmail}</Label>
        <Input 
          id="email" 
          type="email"
          placeholder={translations.formEmailPlaceholder}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="useCase" className="text-sm">{translations.formUseCase}</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={translations.formUseCasePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payments">{translations.formUseCaseCrossBorder}</SelectItem>
            <SelectItem value="treasury">{translations.formUseCaseTreasury}</SelectItem>
            <SelectItem value="trade">{translations.formUseCaseTrade}</SelectItem>
            <SelectItem value="remittance">{translations.formUseCaseRemittance}</SelectItem>
            <SelectItem value="other">{translations.formUseCaseOther}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? translations.submitting : translations.getSandboxAccess}
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
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const consoleTranslations = {
    liveConsole: t('developers.liveConsole'),
    copied: t('developers.copied'),
    copyCurl: t('developers.copyCurl'),
    requestBody: t('developers.requestBody')
  };

  const formTranslations: SandboxFormTranslations = {
    formName: t('developers.formName'),
    formNamePlaceholder: t('developers.formNamePlaceholder'),
    formCompany: t('developers.formCompany'),
    formCompanyPlaceholder: t('developers.formCompanyPlaceholder'),
    formEmail: t('developers.formEmail'),
    formEmailPlaceholder: t('developers.formEmailPlaceholder'),
    formUseCase: t('developers.formUseCase'),
    formUseCasePlaceholder: t('developers.formUseCasePlaceholder'),
    formUseCaseCrossBorder: t('developers.formUseCaseCrossBorder'),
    formUseCaseTreasury: t('developers.formUseCaseTreasury'),
    formUseCaseTrade: t('developers.formUseCaseTrade'),
    formUseCaseRemittance: t('developers.formUseCaseRemittance'),
    formUseCaseOther: t('developers.formUseCaseOther'),
    getSandboxAccess: t('developers.getSandboxAccess'),
    submitting: t('developers.submitting'),
    successTitle: t('developers.successTitle'),
    successMessage: t('developers.successMessage')
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO titleKey="developers" path="/developers" />
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      
      <main>
        {/* Developer-focused Hero */}
        <section className="py-12 md:py-16 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 text-sm bg-primary/10 px-3 py-1.5 rounded-full mb-6">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="font-bold text-black">{t('developers.badge')}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                {t('developers.heroTitle')}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-6">
                {t('developers.heroSubtitle')}
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                  {t('developers.getApiKeys')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                <Button size="lg" variant="outline" asChild>
                  <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer">
                    <BookOpen className="w-4 h-4 mr-2" />
                    {t('developers.apiReference')}
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
              
              <div className="flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">{t('developers.restApi')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">{t('developers.webhooks')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-black">{t('developers.sandbox')}</span>
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
                  <span className="text-sm text-muted-foreground">{t('developers.pair')}</span>
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
                  <span className="text-sm text-muted-foreground">{t('developers.direction')}</span>
                  <select 
                    value={selectedDirection}
                    onChange={(e) => setSelectedDirection(e.target.value)}
                    className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="buy">{t('developers.buyProtectImports')}</option>
                    <option value="sell">{t('developers.sellProtectExports')}</option>
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
                  title={t('developers.stage1Title')}
                  subtitle={t('developers.stage1Subtitle')}
                  currentLabel={t('developers.current')}
                  completeLabel={t('developers.complete')}
                  nextLabel={t('developers.next')}
                />
                <HedgeLifecycleStage
                  stage={2}
                  isActive={activeStage === 2}
                  isComplete={activeStage > 2}
                  onClick={() => setActiveStage(2)}
                  title={t('developers.stage2Title')}
                  subtitle={t('developers.stage2Subtitle')}
                  currentLabel={t('developers.current')}
                  completeLabel={t('developers.complete')}
                  nextLabel={t('developers.next')}
                />
                <HedgeLifecycleStage
                  stage={3}
                  isActive={activeStage === 3}
                  isComplete={false}
                  onClick={() => setActiveStage(3)}
                  title={t('developers.stage3Title')}
                  subtitle={t('developers.stage3Subtitle')}
                  currentLabel={t('developers.current')}
                  completeLabel={t('developers.complete')}
                  nextLabel={t('developers.next')}
                />
              </div>

              {/* Live Console */}
              <LiveConsole stage={activeStage} pair={selectedPair} direction={selectedDirection} translations={consoleTranslations} />
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
                  <h2 className="text-2xl font-bold">{t('developers.buildIt')}</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">{t('developers.simpleRestApi')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('developers.simpleRestApiDesc')}
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">POST /v1/hedges</code>
                        <span className="text-muted-foreground">{t('developers.createHedge')}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">GET /v1/hedges/:id</code>
                        <span className="text-muted-foreground">{t('developers.checkStatus')}</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">POST /v1/hedges/:id/close</code>
                        <span className="text-muted-foreground">{t('developers.closePosition')}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('developers.supportedCurrencies')}</h3>
                    <p className="text-muted-foreground mb-4">
                      {t('developers.supportedCurrenciesDesc')}
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
                  <h2 className="text-2xl font-bold">{t('developers.operateIt')}</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-semibold mb-2">{t('developers.webhooksTitle')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('developers.webhooksDesc')}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('developers.realTimeRates')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('developers.realTimeRatesDesc')}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{t('developers.positionDashboard')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('developers.positionDashboardDesc')}
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
                  <h2 className="text-2xl font-bold">{t('developers.scaleIt')}</h2>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="p-6 rounded-xl border bg-card">
                    <Shield className="w-6 h-6 text-emerald-500 mb-3" />
                    <h3 className="font-semibold">{t('developers.enterpriseSecurity')}</h3>
                  </div>
                  <div className="p-6 rounded-xl border bg-card">
                    <Lock className="w-6 h-6 text-blue-500 mb-3" />
                    <h3 className="font-semibold">{t('developers.complianceReady')}</h3>
                  </div>
                  <div className="p-6 rounded-xl border bg-card">
                    <Headphones className="w-6 h-6 text-purple-500 mb-3" />
                    <h3 className="font-semibold">{t('developers.dedicatedSupport')}</h3>
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
                {t('developers.ctaTitle')}
              </h2>
              <p className="text-muted-foreground mb-8">
                {t('developers.ctaSubtitle')}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                  {t('developers.getApiKeys')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="mailto:developers@hedgi.ai">
                    {t('developers.talkToEngineer')}
                  </a>
                </Button>
              </div>
              
              <div className="flex justify-center gap-8 mt-12 pt-8 border-t">
                <div>
                  <div className="text-2xl font-bold">99.9%</div>
                  <div className="text-sm text-muted-foreground">{t('developers.uptimeSla')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">&lt;50ms</div>
                  <div className="text-sm text-muted-foreground">{t('developers.avgResponse')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-sm text-muted-foreground">{t('developers.support')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Dialog open={isSandboxOpen} onOpenChange={setIsSandboxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('developers.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <SandboxForm onClose={() => setIsSandboxOpen(false)} translations={formTranslations} />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
