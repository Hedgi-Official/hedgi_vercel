import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Code, 
  Zap, 
  Shield, 
  BarChart3, 
  TrendingDown,
  Server,
  FileText,
  ArrowRight,
  Building2,
  Bitcoin,
  Ship,
  Target,
  Check,
  ExternalLink,
  Globe,
  Lock
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
const CodeSnippet = () => {
  const codeLines = [
    { text: 'const ', type: 'keyword' },
    { text: 'apiKey', type: 'variable' },
    { text: ' = process.env.', type: 'plain' },
    { text: 'HEDGI_API_KEY', type: 'constant' },
    { text: ';', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: 'const ', type: 'keyword' },
    { text: 'baseUrl', type: 'variable' },
    { text: ' = ', type: 'plain' },
    { text: '"https://api.hedgi.ai"', type: 'string' },
    { text: ';', type: 'plain' },
    { text: '\n\n', type: 'break' },
    { text: 'const ', type: 'keyword' },
    { text: 'res', type: 'variable' },
    { text: ' = ', type: 'plain' },
    { text: 'await ', type: 'keyword' },
    { text: 'fetch(', type: 'plain' },
    { text: '`${baseUrl}/api/orders`', type: 'string' },
    { text: ', {', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '  method: ', type: 'plain' },
    { text: '"POST"', type: 'string' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '  headers: {', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    ', type: 'plain' },
    { text: 'Authorization', type: 'string' },
    { text: ': ', type: 'plain' },
    { text: '`Bearer ${apiKey}`', type: 'string' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    ', type: 'plain' },
    { text: '"Content-Type"', type: 'string' },
    { text: ': ', type: 'plain' },
    { text: '"application/json"', type: 'string' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '  },', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '  body: JSON.stringify({', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    symbol: ', type: 'plain' },
    { text: '"USDBRL"', type: 'string' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    direction: ', type: 'plain' },
    { text: '"buy"', type: 'string' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    volume: ', type: 'plain' },
    { text: '0.1', type: 'constant' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '    duration_days: ', type: 'plain' },
    { text: '7', type: 'constant' },
    { text: ',', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '  }),', type: 'plain' },
    { text: '\n', type: 'break' },
    { text: '});', type: 'plain' },
    { text: '\n\n', type: 'break' },
    { text: 'const ', type: 'keyword' },
    { text: '{ ', type: 'plain' },
    { text: 'order_id', type: 'variable' },
    { text: ', ', type: 'plain' },
    { text: 'broker', type: 'variable' },
    { text: ', ', type: 'plain' },
    { text: 'entry_price', type: 'variable' },
    { text: ', ', type: 'plain' },
    { text: 'status', type: 'variable' },
    { text: ' } = ', type: 'plain' },
    { text: 'await ', type: 'keyword' },
    { text: 'res.json();', type: 'plain' },
  ];

  const getColor = (type: string) => {
    switch (type) {
      case 'keyword': return 'text-purple-400';
      case 'variable': return 'text-blue-400';
      case 'string': return 'text-green-400';
      case 'constant': return 'text-yellow-400';
      default: return 'text-zinc-300';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-3 md:p-4 lg:p-5 text-[10px] md:text-[11px] lg:text-xs font-mono shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-zinc-500 ml-2 text-[10px]">hedge-order.ts</span>
      </div>
      <pre className="text-zinc-300 whitespace-pre leading-snug">
        {codeLines.map((segment, i) => 
          segment.type === 'break' ? segment.text : (
            <span key={i} className={getColor(segment.type)}>{segment.text}</span>
          )
        )}
      </pre>
    </div>
  );
};

const SandboxRequestForm = () => {
  const { t } = useTranslation();
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
        <Label htmlFor="company">{t('companiesPage.formCompanyLabel')}</Label>
        <Input 
          id="company" 
          placeholder={t('companiesPage.formCompanyPlaceholder')}
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="useCase">{t('companiesPage.formUseCaseLabel')}</Label>
        <Select value={formData.useCase} onValueChange={(value) => setFormData({ ...formData, useCase: value })}>
          <SelectTrigger>
            <SelectValue placeholder={t('companiesPage.formUseCasePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remittance">{t('companiesPage.formUseCaseRemittance')}</SelectItem>
            <SelectItem value="crypto">{t('companiesPage.formUseCaseCrypto')}</SelectItem>
            <SelectItem value="import-export">{t('companiesPage.formUseCaseImportExport')}</SelectItem>
            <SelectItem value="media-spend">{t('companiesPage.formUseCaseMedia')}</SelectItem>
            <SelectItem value="treasury">{t('companiesPage.formUseCaseTreasury')}</SelectItem>
            <SelectItem value="other">{t('companiesPage.formUseCaseOther')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">{t('companiesPage.formVolumeLabel')}</Label>
        <Select value={formData.volumeBand} onValueChange={(value) => setFormData({ ...formData, volumeBand: value })}>
          <SelectTrigger>
            <SelectValue placeholder={t('companiesPage.formVolumePlaceholder')} />
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
        <Label htmlFor="email">{t('companiesPage.formEmailLabel')}</Label>
        <Input 
          id="email" 
          type="email"
          placeholder={t('companiesPage.formEmailPlaceholder')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full">
        {t('companiesPage.requestSandbox')}
      </Button>
    </form>
  );
};

const SolutionCard = ({ 
  icon: Icon, 
  title, 
  pain, 
  outcome 
}: { 
  icon: any; 
  title: string; 
  pain: string; 
  outcome: string; 
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
        <p className="text-xs text-muted-foreground">{pain}</p>
        <p className="text-xs font-medium text-foreground">{outcome}</p>
      </CardContent>
    </Card>
  );
};

export default function ForCompanies() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const renderMainPage = () => (
    <div className="page-container bg-background">
      <SEO titleKey="home" path="/" />
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

      <main className="page-main relative z-10">
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="space-y-12">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                  {t('companiesPage.heroTitle')}
                </h1>
                <p className="text-xl text-muted-foreground">
                  {t('companiesPage.heroSubtitle')}
                </p>
                <div className="flex items-center gap-4 md:gap-6 text-base md:text-lg font-semibold text-foreground flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>{t('companiesPage.stepExposure')}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary" />
                  <span>{t('companiesPage.stepSimulate')}</span>
                  <ArrowRight className="w-5 h-5 text-primary" />
                  <span>{t('companiesPage.stepQuote')}</span>
                  <ArrowRight className="w-5 h-5 text-primary" />
                  <span>{t('companiesPage.stepHedge')}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <Dialog open={isSandboxModalOpen} onOpenChange={setIsSandboxModalOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        {t('companiesPage.requestSandbox')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('companiesPage.requestSandbox')}</DialogTitle>
                      </DialogHeader>
                      <SandboxRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      {t('companiesPage.viewDocs')} <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <div className="lg:py-4">
                <CodeSnippet />
              </div>
            </div>
          </div>
        </section>

        {/* Story Case: The Real Cost of Currency Risk */}
        <section className="py-12 md:py-20 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('companiesPage.storyCaseTitle', { defaultValue: 'The real cost of unprotected payments' })}
                </h2>
                <p className="text-muted-foreground">
                  {t('companiesPage.storyCaseSubtitle', { defaultValue: 'A fintech in São Paulo processes a $50,000 payment to a US supplier' })}
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                <div className="p-6 rounded-xl border-2 border-red-500/20 bg-red-500/5">
                  <div className="flex items-center gap-2 text-red-500 mb-4">
                    <TrendingDown className="w-5 h-5" />
                    <span className="font-semibold">{t('companiesPage.withoutHedging', { defaultValue: 'Without hedging' })}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('companiesPage.withoutHedgingDesc', { defaultValue: 'The Real weakens 3% before settlement. Your client loses R$ 7,500 on a single transaction.' })}
                  </p>
                  <div className="text-3xl font-bold text-red-500">-R$ 7,500</div>
                  <div className="text-sm text-muted-foreground">{t('companiesPage.lostToCurrency', { defaultValue: 'Lost to currency movement' })}</div>
                </div>
                
                <div className="p-6 rounded-xl border-2 border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 text-emerald-500 mb-4">
                    <Shield className="w-5 h-5" />
                    <span className="font-semibold">{t('companiesPage.withHedgi', { defaultValue: 'With Hedgi' })}</span>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    {t('companiesPage.withHedgiDesc', { defaultValue: 'One API call locks the rate. Your client pays exactly what they budgeted with no surprises.' })}
                  </p>
                  <div className="text-3xl font-bold text-emerald-500">R$ 0</div>
                  <div className="text-sm text-muted-foreground">{t('companiesPage.exposureEliminated', { defaultValue: 'Currency exposure eliminated' })}</div>
                </div>
              </div>
              
              <p className="text-center text-lg text-muted-foreground mt-8">
                {t('companiesPage.storyCaseCTA', { defaultValue: 'Protect every transaction with a simple API integration.' })}
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                {t('companiesPage.useCasesTitle')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('companiesPage.useCasesSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              <SolutionCard
                icon={Building2}
                title={t('companiesPage.remittanceTitle')}
                pain={t('companiesPage.remittancePain')}
                outcome={t('companiesPage.remittanceOutcome')}
              />

              <SolutionCard
                icon={Bitcoin}
                title={t('companiesPage.cryptoTitle')}
                pain={t('companiesPage.cryptoPain')}
                outcome={t('companiesPage.cryptoOutcome')}
              />

              <SolutionCard
                icon={Ship}
                title={t('companiesPage.importExportTitle')}
                pain={t('companiesPage.importExportPain')}
                outcome={t('companiesPage.importExportOutcome')}
              />

              <SolutionCard
                icon={Target}
                title={t('companiesPage.affiliateTitle')}
                pain={t('companiesPage.affiliatePain')}
                outcome={t('companiesPage.affiliateOutcome')}
              />

              <SolutionCard
                icon={Globe}
                title={t('companiesPage.globalWorkforceTitle')}
                pain={t('companiesPage.globalWorkforcePain')}
                outcome={t('companiesPage.globalWorkforceOutcome')}
              />

              <Card className="h-full hover:border-primary/40 transition-colors bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mb-2">
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.otherUseCasesTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.otherUseCasesPain')}</p>
                  <p className="text-xs font-medium text-foreground">{t('companiesPage.otherUseCasesOutcome')}</p>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-0 text-foreground font-bold hover:text-foreground/80 text-xs">
                        {t('companiesPage.requestAccess')} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t('companiesPage.requestSandbox')}</DialogTitle>
                      </DialogHeader>
                      <SandboxRequestForm />
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                {t('companiesPage.howItWorksTitle')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('companiesPage.howItWorksSubtitle')}
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('companiesPage.step1Title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('companiesPage.step1Desc')}</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('companiesPage.step2Title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('companiesPage.step2Desc')}</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('companiesPage.step3Title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('companiesPage.step3Desc')}</p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">4</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{t('companiesPage.step4Title')}</h3>
                  <p className="text-xs text-muted-foreground">{t('companiesPage.step4Desc')}</p>
                </div>
              </div>

              <div className="hidden md:block mt-6">
                <div className="relative h-1.5">
                  <div className="absolute inset-0 bg-primary/20 rounded-full" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                  <div className="absolute left-1/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                  <div className="absolute left-2/3 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-primary rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                {t('companiesPage.apiTitle')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('companiesPage.apiSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiQuotesTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiQuotesDesc')}</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiLockTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiLockDesc')}</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiTrackTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiTrackDesc')}</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <TrendingDown className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiCostTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiCostDesc')}</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiReportsTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiReportsDesc')}</p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/40 transition-colors bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center mb-2">
                    <Code className="w-5 h-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{t('companiesPage.apiDocsTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">{t('companiesPage.apiDocsDesc')}</p>
                  <Button variant="ghost" size="sm" className="mt-2 px-0 text-foreground font-semibold hover:text-foreground/80 text-xs" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                      {t('companiesPage.exploreDocs')} <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                  {t('companiesPage.securityTitle')}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {t('companiesPage.securitySubtitle')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-0.5">{t('companiesPage.securityApiKeyTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('companiesPage.securityApiKeyDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-0.5">{t('companiesPage.securityIdempotencyTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('companiesPage.securityIdempotencyDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Server className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-0.5">{t('companiesPage.securityEncryptionTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('companiesPage.securityEncryptionDesc')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-background rounded-lg border">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-0.5">{t('companiesPage.securityAuditTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('companiesPage.securityAuditDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
                {t('companiesPage.partnerTitle')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('companiesPage.partnerSubtitle')}
              </p>

              <Card className="p-5 md:p-6">
                <SandboxRequestForm />
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3">{t('companiesPage.docsFirst')}</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://api.hedgi.ai/docs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      {t('companiesPage.viewApiDocs')} <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );

  return (
    <>
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      {renderMainPage()}
    </>
  );
}
