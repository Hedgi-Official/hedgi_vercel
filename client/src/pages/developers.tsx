import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  MessageSquare,
  Terminal,
  Zap,
} from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  CodeShell,
  CodeShellBody,
  Eyebrow,
  Section,
} from "@/components/marketing";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

/* Hero code snippet — static syntax-colored POST to /api/orders.
   Moved here from /platforms in the hero-swap pass; the /platforms
   hero now shows a product-embed illustration, and this snippet sits
   where the /developers audience actually wants it: in the hero right
   column, next to the "Get API keys" CTA. */
const HeroCodeSnippet = () => {
  const codeLines = [
    { text: "const ", type: "keyword" },
    { text: "apiKey", type: "variable" },
    { text: " = process.env.", type: "plain" },
    { text: "HEDGI_API_KEY", type: "constant" },
    { text: ";", type: "plain" },
    { text: "\n", type: "break" },
    { text: "const ", type: "keyword" },
    { text: "baseUrl", type: "variable" },
    { text: " = ", type: "plain" },
    { text: '"https://api.hedgi.ai"', type: "string" },
    { text: ";", type: "plain" },
    { text: "\n\n", type: "break" },
    { text: "const ", type: "keyword" },
    { text: "res", type: "variable" },
    { text: " = ", type: "plain" },
    { text: "await ", type: "keyword" },
    { text: "fetch(", type: "plain" },
    { text: "`${baseUrl}/api/orders`", type: "string" },
    { text: ", {", type: "plain" },
    { text: "\n", type: "break" },
    { text: "  method: ", type: "plain" },
    { text: '"POST"', type: "string" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "  headers: {", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    ", type: "plain" },
    { text: "Authorization", type: "string" },
    { text: ": ", type: "plain" },
    { text: "`Bearer ${apiKey}`", type: "string" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    ", type: "plain" },
    { text: '"Content-Type"', type: "string" },
    { text: ": ", type: "plain" },
    { text: '"application/json"', type: "string" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "  },", type: "plain" },
    { text: "\n", type: "break" },
    { text: "  body: JSON.stringify({", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    symbol: ", type: "plain" },
    { text: '"USDBRL"', type: "string" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    direction: ", type: "plain" },
    { text: '"buy"', type: "string" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    volume: ", type: "plain" },
    { text: "0.1", type: "constant" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "    duration_days: ", type: "plain" },
    { text: "7", type: "constant" },
    { text: ",", type: "plain" },
    { text: "\n", type: "break" },
    { text: "  }),", type: "plain" },
    { text: "\n", type: "break" },
    { text: "});", type: "plain" },
    { text: "\n\n", type: "break" },
    { text: "const ", type: "keyword" },
    { text: "{ ", type: "plain" },
    { text: "order_id", type: "variable" },
    { text: ", ", type: "plain" },
    { text: "broker", type: "variable" },
    { text: ", ", type: "plain" },
    { text: "entry_price", type: "variable" },
    { text: ", ", type: "plain" },
    { text: "status", type: "variable" },
    { text: " } = ", type: "plain" },
    { text: "await ", type: "keyword" },
    { text: "res.json();", type: "plain" },
  ];

  const getColor = (type: string) => {
    switch (type) {
      case "keyword":
        return "text-purple-400";
      case "variable":
        return "text-blue-400";
      case "string":
        return "text-emerald-400";
      case "constant":
        return "text-yellow-400";
      default:
        return "text-zinc-300";
    }
  };

  return (
    <CodeShell variant="window" label="hedge-order.ts">
      <CodeShellBody>
        {codeLines.map((segment, i) =>
          segment.type === "break" ? (
            segment.text
          ) : (
            <span key={i} className={getColor(segment.type)}>
              {segment.text}
            </span>
          ),
        )}
      </CodeShellBody>
    </CodeShell>
  );
};

const HedgeLifecycleStage = ({
  stage,
  isActive,
  isComplete,
  onClick,
  title,
  subtitle,
  currentLabel,
  completeLabel,
  nextLabel,
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
    className={cn(
      "flex-1 rounded-xl border-2 p-5 text-left transition-[border-color,background-color,box-shadow]",
      isActive
        ? "border-primary bg-primary/5 shadow-sm"
        : isComplete
          ? "border-success/50 bg-success/5"
          : "border-border hover:border-primary/30",
    )}
  >
    <div className="mb-2 flex items-center gap-3">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
          isActive
            ? "bg-primary text-primary-foreground"
            : isComplete
              ? "bg-success text-success-foreground"
              : "bg-muted text-muted-foreground",
        )}
      >
        {isComplete ? <Check className="h-4 w-4" /> : stage}
      </div>
      <span
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.18em]",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {isActive ? currentLabel : isComplete ? completeLabel : nextLabel}
      </span>
    </div>
    <h3
      className={cn(
        "mb-1 text-sm font-semibold",
        isActive ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {title}
    </h3>
    <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
  </button>
);

const LiveConsole = ({
  stage,
  pair,
  direction,
  translations,
}: {
  stage: number;
  pair: string;
  direction: string;
  translations: {
    liveConsole: string;
    copied: string;
    copyCurl: string;
    requestBody: string;
  };
}) => {
  const [copied, setCopied] = useState(false);

  const stageData = {
    1: {
      method: "POST",
      endpoint: "/api/orders",
      request: `{
  "symbol": "${pair}",
  "direction": "${direction}",
  "volume": 0.5,
  "duration_days": 30
}`,
      response: `{
  "order_id": 12345,
  "status": "active",
  "symbol": "${pair}",
  "direction": "${direction}",
  "volume": 0.5,
  "broker": "Broker_B",
  "entry_price": 4.9847,
  "timestamp": "2026-02-14T00:00:00Z"
}`,
    },
    2: {
      method: "GET",
      endpoint: "/api/orders/12345",
      request: null as string | null,
      response: `{
  "order_id": 12345,
  "status": "active",
  "symbol": "${pair}",
  "volume": 0.5,
  "broker": "Broker_B",
  "entry_price": 4.9847,
  "current_price": 5.1234,
  "unrealized_pnl": 6935.00
}`,
    },
    3: {
      method: "POST",
      endpoint: "/api/orders/12345/close",
      request: null as string | null,
      response: `{
  "order_id": 12345,
  "status": "closed",
  "exit_price": 5.1234,
  "realized_pnl": 6935.00
}`,
    },
  };

  const data = stageData[stage as keyof typeof stageData];

  const handleCopy = () => {
    const text = data.request
      ? `curl -X ${data.method} https://api.hedgi.ai${data.endpoint} \\\n  -H "Authorization: Bearer $HEDGI_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${data.request.replace(/\n/g, "")}'`
      : `curl -X ${data.method} https://api.hedgi.ai${data.endpoint} -H "Authorization: Bearer $HEDGI_API_KEY"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAction = (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-100"
    >
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? translations.copied : translations.copyCurl}
    </button>
  );

  return (
    <CodeShell
      variant="terminal"
      icon={Terminal}
      label={translations.liveConsole}
      action={copyAction}
    >
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-semibold",
                data.method === "POST"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-emerald-500/20 text-emerald-400",
              )}
            >
              {data.method}
            </span>
            <span className="text-zinc-400">{data.endpoint}</span>
          </div>

          {data.request ? (
            <div className="rounded-lg bg-zinc-900 p-3">
              <div className="mb-1 text-xs text-zinc-500">
                {translations.requestBody}
              </div>
              <pre className="whitespace-pre-wrap text-emerald-400">
                {data.request}
              </pre>
            </div>
          ) : null}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-3 w-3 text-emerald-400" />
            <span className="text-xs text-emerald-400">200 OK</span>
            <span className="text-xs text-zinc-600">• 43ms</span>
          </div>
          <div className="rounded-lg bg-zinc-900 p-3">
            <pre className="whitespace-pre-wrap text-zinc-300">
              {data.response}
            </pre>
          </div>
        </div>
      </div>
    </CodeShell>
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

const SandboxForm = ({
  translations,
}: {
  onClose?: () => void;
  translations: SandboxFormTranslations;
}) => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    useCase: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sandbox-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: "developers" }),
      });
      if (!response.ok) {
        throw new Error("Failed to submit request");
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Sandbox request error:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="mb-2 font-display text-xl font-semibold">
          {translations.successTitle}
        </h3>
        <p className="text-muted-foreground">{translations.successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-sm">
            {translations.formName}
          </Label>
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
          <Label htmlFor="company" className="text-sm">
            {translations.formCompany}
          </Label>
          <Input
            id="company"
            placeholder={translations.formCompanyPlaceholder}
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            required
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="email" className="text-sm">
          {translations.formEmail}
        </Label>
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
        <Label htmlFor="useCase" className="text-sm">
          {translations.formUseCase}
        </Label>
        <Select
          value={formData.useCase}
          onValueChange={(value) =>
            setFormData({ ...formData, useCase: value })
          }
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder={translations.formUseCasePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="payments">
              {translations.formUseCaseCrossBorder}
            </SelectItem>
            <SelectItem value="treasury">
              {translations.formUseCaseTreasury}
            </SelectItem>
            <SelectItem value="trade">
              {translations.formUseCaseTrade}
            </SelectItem>
            <SelectItem value="remittance">
              {translations.formUseCaseRemittance}
            </SelectItem>
            <SelectItem value="other">
              {translations.formUseCaseOther}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        type="submit"
        className="w-full sm:w-auto sm:min-w-[14rem]"
        disabled={isSubmitting}
      >
        {isSubmitting ? translations.submitting : translations.getSandboxAccess}
      </Button>
    </form>
  );
};

/* A single row in the triptych. Eyebrow + icon tile + H2 + optional
   children. Children are optional so a row can render as a title-only
   step (e.g. "Scale it" whose prior trust strip was removed per audit). */
const TriptychRow = ({
  index,
  total,
  icon: Icon,
  title,
  className,
  children,
}: {
  index: number;
  total: number;
  icon: typeof Zap;
  title: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div className={className}>
    <Eyebrow className="mb-3">
      {index} / {total} · {title}
    </Eyebrow>
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-navy/10">
        <Icon className="h-5 w-5 text-accent-navy" />
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight md:text-[1.625rem]">
        {title}
      </h2>
    </div>
    {children}
  </div>
);

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
    liveConsole: t("developers.liveConsole"),
    copied: t("developers.copied"),
    copyCurl: t("developers.copyCurl"),
    requestBody: t("developers.requestBody"),
  };

  const formTranslations: SandboxFormTranslations = {
    formName: t("developers.formName"),
    formNamePlaceholder: t("developers.formNamePlaceholder"),
    formCompany: t("developers.formCompany"),
    formCompanyPlaceholder: t("developers.formCompanyPlaceholder"),
    formEmail: t("developers.formEmail"),
    formEmailPlaceholder: t("developers.formEmailPlaceholder"),
    formUseCase: t("developers.formUseCase"),
    formUseCasePlaceholder: t("developers.formUseCasePlaceholder"),
    formUseCaseCrossBorder: t("developers.formUseCaseCrossBorder"),
    formUseCaseTreasury: t("developers.formUseCaseTreasury"),
    formUseCaseTrade: t("developers.formUseCaseTrade"),
    formUseCaseRemittance: t("developers.formUseCaseRemittance"),
    formUseCaseOther: t("developers.formUseCaseOther"),
    getSandboxAccess: t("developers.getSandboxAccess"),
    submitting: t("developers.submitting"),
    successTitle: t("developers.successTitle"),
    successMessage: t("developers.successMessage"),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO titleKey="developers" path="/developers" />
      <Header
        showAuthButton={!user}
        username={user?.username}
        onLogout={handleLogout}
      />

      <main>
        {/* Hero — two-column, matches /platforms structure exactly.
            Left: eyebrow pill + H1 + subtitle + CTA pair + trust strip
            + cross-link, all left-aligned. Right: HeroCodeSnippet
            (moved here from /platforms in the hero-swap pass). */}
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-navy/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                  <Terminal className="h-3.5 w-3.5" />
                  <span>{t("developers.badge")}</span>
                </div>

                <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                  {t("developers.heroTitle")}
                </h1>

                <p className="text-xl text-muted-foreground">
                  {t("developers.heroSubtitle")}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                    {t("developers.getApiKeys")}
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a
                      href="https://api.hedgi.ai/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen className="mr-1 h-4 w-4" />
                      {t("developers.apiReference")}
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </a>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{t("developers.sandbox")}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{t("developers.webhooks")}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>{t("developers.restApi")}</span>
                  </div>
                </div>

                {/* Cross-sell link — matches the restyled pattern on
                    the /business and /platforms hero cross-links.
                    Navy eyebrow, muted body + arrow, middle dot
                    hidden below sm so it wraps cleanly. */}
                <div>
                  <Link
                    href="/platforms"
                    className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                      {t("developers.crossLinkPlatformsEyebrow")}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden sm:inline"
                    >
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t("developers.crossLinkPlatformsBody")}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>

              <div className="lg:py-4">
                <HeroCodeSnippet />
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Hedge Lifecycle + Live Console */}
        <Section tone="muted" density="default" width="wide">
          <div className="mx-auto max-w-5xl">
            {/* Parameter controls */}
            <div className="mb-6 flex flex-wrap justify-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("developers.pair")}
                </span>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
                >
                  <option value="USDBRL">USD/BRL</option>
                  <option value="EURUSD">EUR/USD</option>
                  <option value="USDMXN">USD/MXN</option>
                </select>
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("developers.direction")}
                </span>
                <select
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  className="cursor-pointer bg-transparent text-sm font-medium focus:outline-none"
                >
                  <option value="buy">
                    {t("developers.buyProtectImports")}
                  </option>
                  <option value="sell">
                    {t("developers.sellProtectExports")}
                  </option>
                </select>
              </div>
            </div>

            {/* Auth header chip */}
            <div className="mb-8 flex justify-center">
              <code className="num-body rounded border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground">
                Authorization: Bearer $HEDGI_API_KEY
              </code>
            </div>

            {/* Lifecycle Stages */}
            <div className="mb-6 grid gap-3 md:grid-cols-3">
              <HedgeLifecycleStage
                stage={1}
                isActive={activeStage === 1}
                isComplete={activeStage > 1}
                onClick={() => setActiveStage(1)}
                title={t("developers.stage1Title")}
                subtitle={t("developers.stage1Subtitle")}
                currentLabel={t("developers.current")}
                completeLabel={t("developers.complete")}
                nextLabel={t("developers.next")}
              />
              <HedgeLifecycleStage
                stage={2}
                isActive={activeStage === 2}
                isComplete={activeStage > 2}
                onClick={() => setActiveStage(2)}
                title={t("developers.stage2Title")}
                subtitle={t("developers.stage2Subtitle")}
                currentLabel={t("developers.current")}
                completeLabel={t("developers.complete")}
                nextLabel={t("developers.next")}
              />
              <HedgeLifecycleStage
                stage={3}
                isActive={activeStage === 3}
                isComplete={false}
                onClick={() => setActiveStage(3)}
                title={t("developers.stage3Title")}
                subtitle={t("developers.stage3Subtitle")}
                currentLabel={t("developers.current")}
                completeLabel={t("developers.complete")}
                nextLabel={t("developers.next")}
              />
            </div>

            {/* Live Console */}
            <LiveConsole
              stage={activeStage}
              pair={selectedPair}
              direction={selectedDirection}
              translations={consoleTranslations}
            />
          </div>
        </Section>

        {/* Build it / Operate it / Scale it triptych. Scale it renders
            as a title-only step — prior unsubstantiated trust strip
            stays removed (see comment at the row). */}
        <Section density="default">
          <div className="mx-auto max-w-5xl">
            <TriptychRow
              index={1}
              total={3}
              icon={Zap}
              title={t("developers.buildIt")}
              className="mb-10"
            >
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h3 className="mb-4 font-semibold">
                    {t("developers.simpleRestApi")}
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <code className="num-body rounded bg-muted px-2 py-0.5 text-xs">
                        POST /api/orders
                      </code>
                      <span className="text-muted-foreground">
                        {t("developers.createHedge")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <code className="num-body rounded bg-muted px-2 py-0.5 text-xs">
                        GET /api/orders/:order_id
                      </code>
                      <span className="text-muted-foreground">
                        {t("developers.checkStatus")}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <code className="num-body rounded bg-muted px-2 py-0.5 text-xs">
                        POST /api/orders/:order_id/close
                      </code>
                      <span className="text-muted-foreground">
                        {t("developers.closePosition")}
                      </span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 font-semibold">
                    {t("developers.supportedCurrencies")}
                  </h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    {t("developers.supportedCurrenciesDesc")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "USD/BRL",
                      "EUR/BRL",
                      "USD/MXN",
                      "BRL/CNY",
                    ].map((pair) => (
                      <span
                        key={pair}
                        className="num-body rounded-full bg-muted px-3 py-1 text-xs"
                      >
                        {pair}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </TriptychRow>

            <TriptychRow
              index={2}
              total={3}
              icon={Activity}
              title={t("developers.operateIt")}
              className="mb-10"
            >
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">
                    {t("developers.webhooksTitle")}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("developers.webhooksDesc")}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">
                    {t("developers.realTimeRates")}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("developers.realTimeRatesDesc")}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">
                    {t("developers.positionDashboard")}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t("developers.positionDashboardDesc")}
                  </p>
                </div>
              </div>
            </TriptychRow>

            {/* "Scale it" renders as a title-only step. The prior
                trust strip (enterprise security / compliance ready /
                dedicated support) was removed per audit as
                unsubstantiated; row kept for narrative completeness
                (Build it → Operate it → Scale it). Body intentionally
                blank — add content only if it can be substantiated. */}
            <TriptychRow
              index={3}
              total={3}
              icon={Globe}
              title={t("developers.scaleIt")}
            />
          </div>
        </Section>

        {/* Final CTA — full-bleed navy panel. Primary "Get API keys"
            keeps mint styling (pops against navy). Secondary "Talk
            to an engineer" converted to ghost-outline: transparent
            bg, white border, white text, hover:bg-white/10. */}
        <Section tone="navy" className="py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("developers.ctaTitle")}
            </h2>
            <p className="mb-8 text-base leading-relaxed text-white/70 md:text-lg">
              {t("developers.ctaSubtitle")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => setIsSandboxOpen(true)}>
                {t("developers.getApiKeys")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white bg-transparent text-white hover:bg-white/10 hover:text-white focus-visible:ring-white"
              >
                <a href="mailto:developers@hedgi.ai">
                  {t("developers.talkToEngineer")}
                </a>
              </Button>
            </div>

            {/* Reassurance row — muted-white icons + text. */}
            <ul className="mt-8 flex flex-col items-center gap-3 text-sm text-white/70 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-2">
              <li className="flex items-center gap-2">
                <Zap
                  aria-hidden="true"
                  className="h-4 w-4 text-white/70"
                />
                <span>{t("developers.reassureSandboxFast")}</span>
              </li>
              <li className="flex items-center gap-2">
                <BookOpen
                  aria-hidden="true"
                  className="h-4 w-4 text-white/70"
                />
                <span>{t("developers.reassureFullRef")}</span>
              </li>
              <li className="flex items-center gap-2">
                <MessageSquare
                  aria-hidden="true"
                  className="h-4 w-4 text-white/70"
                />
                <span>{t("developers.reassureDirectSlack")}</span>
              </li>
            </ul>
          </div>
        </Section>
      </main>

      <Dialog open={isSandboxOpen} onOpenChange={setIsSandboxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("developers.dialogTitle")}</DialogTitle>
          </DialogHeader>
          <SandboxForm
            onClose={() => setIsSandboxOpen(false)}
            translations={formTranslations}
          />
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
