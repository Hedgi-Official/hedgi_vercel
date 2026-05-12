import { Fragment, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bitcoin,
  Building2,
  Code,
  CheckCircle2,
  ExternalLink,
  Globe,
  Headphones,
  KeyRound,
  ShieldCheck,
  Ship,
  Target,
  TrendingDown,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContentCard,
  ProductEmbedCard,
  Section,
  SectionHeader,
} from "@/components/marketing";
import { useUser } from "@/hooks/use-user";

const SandboxRequestForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    company: "",
    useCase: "",
    volumeBand: "",
    email: "",
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
        body: JSON.stringify({ ...formData, source: "platforms" }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setSubmitted(true);
    } catch (error) {
      console.error("[SandboxRequestForm] Submit error:", error);
      alert(t("companiesPage.formErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-2">
          {t("companiesPage.formSuccessTitle")}
        </h3>
        <p className="text-muted-foreground">
          {t("companiesPage.formSuccessMessage")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company">
          {t("companiesPage.formCompanyLabel")}
        </Label>
        <Input
          id="company"
          placeholder={t("companiesPage.formCompanyPlaceholder")}
          value={formData.company}
          onChange={(e) =>
            setFormData({ ...formData, company: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="useCase">{t("companiesPage.formUseCaseLabel")}</Label>
        <Select
          value={formData.useCase}
          onValueChange={(value) =>
            setFormData({ ...formData, useCase: value })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("companiesPage.formUseCasePlaceholder")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remittance">
              {t("companiesPage.formUseCaseRemittance")}
            </SelectItem>
            <SelectItem value="crypto">
              {t("companiesPage.formUseCaseCrypto")}
            </SelectItem>
            <SelectItem value="import-export">
              {t("companiesPage.formUseCaseImportExport")}
            </SelectItem>
            <SelectItem value="media-spend">
              {t("companiesPage.formUseCaseMedia")}
            </SelectItem>
            <SelectItem value="treasury">
              {t("companiesPage.formUseCaseTreasury")}
            </SelectItem>
            <SelectItem value="other">
              {t("companiesPage.formUseCaseOther")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">{t("companiesPage.formVolumeLabel")}</Label>
        <Select
          value={formData.volumeBand}
          onValueChange={(value) =>
            setFormData({ ...formData, volumeBand: value })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("companiesPage.formVolumePlaceholder")}
            />
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
        <Label htmlFor="email">{t("companiesPage.formEmailLabel")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("companiesPage.formEmailPlaceholder")}
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          required
        />
      </div>
      <div className="flex justify-center pt-1">
        <Button
          type="submit"
          size="lg"
          className="w-full max-w-sm sm:w-auto sm:max-w-none sm:min-w-[14rem]"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? t("companiesPage.formSubmitting")
            : t("companiesPage.requestSandbox")}
        </Button>
      </div>
    </form>
  );
};

export default function Platforms() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const steps = ["stepExposure", "stepSimulate", "stepQuote", "stepHedge"];

  return (
    <div className="page-container bg-background">
      <SEO titleKey="platforms" path="/platforms" />
      <Header
        showAuthButton={!user}
        username={user?.username}
        onLogout={handleLogout}
      />

      <main className="page-main">
        {/* Hero — 2-col, copy + CodeShell */}
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                  {t("companiesPage.heroTitle")}
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {t("companiesPage.heroSubtitle")}
                </p>

                {/* Step indicator — symmetric markup, wraps consistently */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-foreground md:text-base">
                  {steps.map((key, i) => (
                    <Fragment key={key}>
                      {i > 0 ? (
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary/60" />
                      ) : null}
                      <span
                        className={
                          i === 0
                            ? "inline-flex items-center gap-2"
                            : undefined
                        }
                      >
                        {i === 0 ? (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        ) : null}
                        {t(`companiesPage.${key}`)}
                      </span>
                    </Fragment>
                  ))}
                </div>

                <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Dialog
                    open={isSandboxModalOpen}
                    onOpenChange={setIsSandboxModalOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="lg">
                        {t("companiesPage.requestSandbox")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {t("companiesPage.requestSandbox")}
                        </DialogTitle>
                      </DialogHeader>
                      <SandboxRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a
                      href="https://api.hedgi.ai/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      {t("companiesPage.viewDocs")}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* Cross-sell link — matches the restyled pattern on
                    the /business and /developers hero cross-links.
                    Navy eyebrow, muted body + arrow, middle dot
                    hidden below sm so it wraps cleanly. */}
                <Link
                  href="/"
                  className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                    {t("companiesPage.crossLinkBusinessesEyebrow")}
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden sm:inline"
                  >
                    ·
                  </span>
                  <span className="inline-flex items-center gap-1">
                    {t("companiesPage.crossLinkBusinessesBody")}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>

              <div className="lg:py-4">
                <ProductEmbedCard />
              </div>
            </div>
          </div>
        </section>

        {/* "Story case" section removed 2026-04-20 — archived at
            client/src/pages/archive/platforms-story-case.tsx for
            restoration later. Re-import PlatformsStoryCase and
            mount here to bring it back. */}

        {/* Use cases grid */}
        <Section tone="muted" density="compact">
          <SectionHeader
            title={t("companiesPage.useCasesTitle")}
            subtitle={t("companiesPage.useCasesSubtitle")}
          />
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <ContentCard
              icon={Building2}
              title={t("companiesPage.remittanceTitle")}
              body={t("companiesPage.remittancePain")}
              outcome={t("companiesPage.remittanceOutcome")}
            />
            <ContentCard
              icon={Bitcoin}
              title={t("companiesPage.cryptoTitle")}
              body={t("companiesPage.cryptoPain")}
              outcome={t("companiesPage.cryptoOutcome")}
            />
            <ContentCard
              icon={Ship}
              title={t("companiesPage.importExportTitle")}
              body={t("companiesPage.importExportPain")}
              outcome={t("companiesPage.importExportOutcome")}
            />
            <ContentCard
              icon={Target}
              title={t("companiesPage.affiliateTitle")}
              body={t("companiesPage.affiliatePain")}
              outcome={t("companiesPage.affiliateOutcome")}
            />
            <ContentCard
              icon={Globe}
              title={t("companiesPage.globalWorkforceTitle")}
              body={t("companiesPage.globalWorkforcePain")}
              outcome={t("companiesPage.globalWorkforceOutcome")}
            />
            <ContentCard
              featured
              icon={ArrowRight}
              title={t("companiesPage.otherUseCasesTitle")}
              body={t("companiesPage.otherUseCasesPain")}
              outcome={t("companiesPage.otherUseCasesOutcome")}
              action={
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-auto px-0 text-sm">
                      {t("companiesPage.requestAccess")}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {t("companiesPage.requestSandbox")}
                      </DialogTitle>
                    </DialogHeader>
                    <SandboxRequestForm />
                  </DialogContent>
                </Dialog>
              }
            />
          </div>
        </Section>

        {/* How it works — 4 steps with muted connector line (desktop).
            Vertical padding trimmed ~20% so steps sit closer to the
            header; matches the same trim applied on /business. */}
        <Section density="compact" className="py-8 md:py-12">
          <SectionHeader
            title={t("companiesPage.howItWorksTitle")}
            subtitle={t("companiesPage.howItWorksSubtitle")}
          />
          <div className="mx-auto max-w-4xl">
            <div className="relative grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Opaque pale mint — #EAFDF8 is the pre-blended
                      equivalent of bg-primary/10 over this section's
                      (now default/white) background. Opaque fill keeps
                      the connector line from showing through the
                      circle's middle, matching the /business fix. */}
                  <div className="num-body relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-[#eafdf8] text-base font-semibold text-primary">
                    {n}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {t(`companiesPage.step${n}Title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`companiesPage.step${n}Desc`)}
                  </p>
                </div>
              ))}

              {/* Muted connector line behind the number circles.
                  Runs from center of circle 1 to center of circle 4
                  (12.5% inset each side on a 4-col grid). Hidden below
                  md where circles stack into 2 cols. Same treatment
                  on /business so both pages read as the same component. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-border md:block"
              />
            </div>
          </div>
        </Section>

        {/* What you get (API benefits) */}
        <Section tone="muted" density="compact">
          <SectionHeader
            title={t("companiesPage.apiTitle")}
            subtitle={t("companiesPage.apiSubtitle")}
          />
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <ContentCard
              icon={Zap}
              title={t("companiesPage.apiTimeToValueTitle")}
              body={t("companiesPage.apiTimeToValueDesc")}
            />
            <ContentCard
              icon={TrendingDown}
              title={t("companiesPage.apiTransparentPricingTitle")}
              body={t("companiesPage.apiTransparentPricingDesc")}
            />
            <ContentCard
              icon={Target}
              title={t("companiesPage.apiCustomerOutcomeTitle")}
              body={t("companiesPage.apiCustomerOutcomeDesc")}
            />
            <ContentCard
              icon={Globe}
              title={t("companiesPage.apiCoverageTitle")}
              body={t("companiesPage.apiCoverageDesc")}
            />
            <ContentCard
              featured
              icon={Code}
              title={t("companiesPage.apiLiveConsoleTitle")}
              body={t("companiesPage.apiLiveConsoleDesc")}
              action={
                <Button variant="ghost" size="sm" className="h-auto px-0 text-sm" asChild>
                  <Link href="/developers" className="flex items-center gap-1">
                    {t("companiesPage.viewDevelopers")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              }
            />
          </div>
        </Section>

        {/* Partner / sandbox form — full-bleed navy panel. Form card
            sits inside the panel as a white inset with a soft shadow
            for lift; its internal light styling stays unchanged (form
            inputs on dark backgrounds reduce affordance). Docs escape
            hatch moved below the form card, rendered in muted-white
            for the dark panel. Reassurance row below the docs link. */}
        <Section tone="navy" className="py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-[2.125rem] lg:text-4xl">
              {t("companiesPage.partnerTitle")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/70 md:text-lg">
              {t("companiesPage.partnerSubtitle")}
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-xl">
            {/* White inset form card. No colored border — just a
                strong shadow so it lifts off the navy cleanly. */}
            <div className="rounded-2xl bg-card p-6 text-foreground shadow-2xl md:p-7">
              <SandboxRequestForm />
            </div>
          </div>
          {/* Docs escape hatch — muted white, below the form card. */}
          <div className="mt-6 flex flex-col items-center gap-1 text-sm sm:flex-row sm:justify-center sm:gap-2">
            <span className="text-xs text-white/60">
              {t("companiesPage.docsFirst")}
            </span>
            <a
              href="https://api.hedgi.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-white/80 underline-offset-2 transition-colors hover:text-white hover:underline"
            >
              {t("companiesPage.viewApiDocs")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {/* Reassurance row — muted-white icons + text. */}
          <ul className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-3 text-sm text-white/70 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-2">
            <li className="flex items-center gap-2">
              <KeyRound
                aria-hidden="true"
                className="h-4 w-4 text-white/70"
              />
              <span>{t("companiesPage.reassureSandboxAccess")}</span>
            </li>
            <li className="flex items-center gap-2">
              <Headphones
                aria-hidden="true"
                className="h-4 w-4 text-white/70"
              />
              <span>{t("companiesPage.reassureDirectSupport")}</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="h-4 w-4 text-white/70"
              />
              <span>{t("companiesPage.reassureNoLaunchCommitment")}</span>
            </li>
          </ul>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
