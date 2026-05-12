import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  ShieldCheck,
  Ship,
  Wallet,
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
import { BusinessSimulator } from "@/components/business-simulator";
import { Typewriter } from "@/components/typewriter";
import {
  ContentCard,
  OfferPill,
  PricingComparisonCard,
  Section,
  SectionHeader,
  SimulatorShell,
} from "@/components/marketing";
import { useHeroRate, type HeroRate } from "@/hooks/use-hero-rate";
import { formatRate } from "@/lib/format-rate";
import { useUser } from "@/hooks/use-user";

const AccessRequestForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    company: "",
    email: "",
    useCase: "",
    volumeBand: "",
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
        body: JSON.stringify({ ...formData, source: "business" }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setSubmitted(true);
    } catch (error) {
      console.error("[AccessRequestForm] Submit error:", error);
      alert(t("business.formErrorGeneric"));
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
          {t("business.formSuccessTitle")}
        </h3>
        <p className="text-muted-foreground">
          {t("business.formSuccessMessage")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company">{t("business.formCompanyLabel")}</Label>
        <Input
          id="company"
          placeholder={t("business.formCompanyPlaceholder")}
          value={formData.company}
          onChange={(e) =>
            setFormData({ ...formData, company: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="email">{t("business.formEmailLabel")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("business.formEmailPlaceholder")}
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          required
        />
      </div>
      <div>
        <Label htmlFor="useCase">{t("business.formUseCaseLabel")}</Label>
        <Select
          value={formData.useCase}
          onValueChange={(value) =>
            setFormData({ ...formData, useCase: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("business.formUseCasePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="imports">
              {t("business.formUseCaseImports")}
            </SelectItem>
            <SelectItem value="software">
              {t("business.formUseCaseSoftware")}
            </SelectItem>
            <SelectItem value="usd-revenue">
              {t("business.formUseCaseUsdRevenue")}
            </SelectItem>
            <SelectItem value="treasury">
              {t("business.formUseCaseTreasury")}
            </SelectItem>
            <SelectItem value="other">
              {t("business.formUseCaseOther")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">{t("business.formVolumeLabel")}</Label>
        <Select
          value={formData.volumeBand}
          onValueChange={(value) =>
            setFormData({ ...formData, volumeBand: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("business.formVolumePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under-10k">Under $10K</SelectItem>
            <SelectItem value="10k-50k">$10K - $50K</SelectItem>
            <SelectItem value="50k-250k">$50K - $250K</SelectItem>
            <SelectItem value="250k-1m">$250K - $1M</SelectItem>
            <SelectItem value="over-1m">Over $1M</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? t("business.formSubmitting")
          : t("business.formSubmit")}
      </Button>
    </form>
  );
};

/**
 * Locale-aware 4-decimal rate formatter shared by the PreviewCard and
 * the transparency Hedgi card. PT-BR uses a comma decimal separator to
 * stay consistent with the rest of the site's rate displays.
 */
// formatRate lives in `@/lib/format-rate` so /what-is-hedge and any
// other consumer renders the same useHeroRate() value with identical
// precision + locale handling. Imported below.

/**
 * Markup is the spread baked on top of the mid-market rate. Showing
 * it as a raw decimal (0.0513) hides information; showing it as a
 * percent of the underlying rate (1.02%) is what "transparent
 * pricing" actually means. PT locale uses comma decimal separator.
 */
const formatMarkupPercent = (
  rate: number,
  breakeven: number,
  isPt: boolean,
): string => {
  if (!rate || rate <= 0) return isPt ? "0,00%" : "0.00%";
  const pct = ((breakeven - rate) / rate) * 100;
  const fixed = pct.toFixed(2);
  return (isPt ? fixed.replace(".", ",") : fixed) + "%";
};

/**
 * PreviewCard — hero right-rail mini-receipt. Four zones:
 *   1. Header: "REFERENCE RATE" eyebrow + live indicator (when fresh) +
 *      "USD / BRL" symbol on a shared baseline, thin rule below.
 *   2. Context: "Locking $10,000 USD · 30 days".
 *   3. Rows: Rate / Markup / You pay — live values from the hero-rate
 *      polling hook (lifted to the Business page so the transparency
 *      Hedgi card can reuse the same data source without a second
 *      poll). Geist Mono tabular for decimal alignment. Markup is
 *      derived = breakevenRate - rate. Each value re-mounts with a key
 *      tied to its numeric text, triggering the flash-mint CSS
 *      animation only on actual changes.
 *   4. Offer strip: mint-tinted footer with the $1,000 pill copy.
 */
const PreviewCard = ({
  data,
  isLive,
}: {
  data: HeroRate;
  isLive: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");

  const rateText = formatRate(data.rate, isPt);
  const markupText = formatMarkupPercent(data.rate, data.breakevenRate, isPt);
  const totalText = formatRate(data.breakevenRate, isPt);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="p-6 md:p-7">
        {/* Zone 1 — header: navy label + optional live indicator + symbol.
            Label uses the shared eyebrow register (navy, 0.18em tracking)
            so this card reads from the same pattern as every other
            product/data surface on the site. */}
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {t("business.previewLabel")}
          </span>
          <div className="flex items-baseline gap-3">
            {isLive ? (
              <span className="inline-flex items-baseline gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                <span
                  aria-hidden="true"
                  className="relative inline-flex h-1.5 w-1.5 translate-y-[1px]"
                >
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70 [animation-duration:1.5s]" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                {t("business.liveRateLabel")}
              </span>
            ) : null}
            <span className="num-body tabular-nums text-xs text-primary">
              {t("business.previewSymbol")}
            </span>
          </div>
        </div>

        {/* Zone 2 — context line */}
        <p className="mt-5 text-sm text-muted-foreground">
          {t("business.previewAction")}
        </p>

        {/* Zone 3 — rows with live values. Grid auto-sized number column
            + tabular-nums keeps decimals on a shared vertical axis.
            `key` on each value triggers the flash-mint animation only
            when the rendered text actually changes. */}
        <dl className="mt-5 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
          <dt className="text-muted-foreground">
            {t("business.previewRateLabel")}
          </dt>
          <dd className="num-body tabular-nums text-right">
            <span key={rateText} className="flash-mint">
              {rateText}
            </span>
          </dd>

          <dt className="text-muted-foreground">
            {t("business.previewMarkupLabel")}
          </dt>
          <dd className="num-body tabular-nums text-right">
            <span key={markupText} className="flash-mint">
              {markupText}
            </span>
          </dd>

          <dt className="text-base font-semibold text-foreground">
            {t("business.previewTotalLabel")}
          </dt>
          <dd className="num-body tabular-nums text-right text-base font-semibold text-primary">
            <span key={totalText} className="flash-mint">
              {totalText}
            </span>
          </dd>
        </dl>
      </div>

      {/* Zone 4 — offer strip, flush to card bottom edge.
          whitespace-pre-line turns the \n in business.heroPill
          into a visible line break at "gain,". */}
      <div className="border-t border-primary/20 bg-primary/5 px-6 py-3.5 text-center md:px-7">
        <span className="whitespace-pre-line text-sm font-medium text-foreground">
          {t("business.heroPill")}
        </span>
      </div>
    </div>
  );
};

export default function Business() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Hero-rate hook for the PreviewCard only. The transparency section
  // no longer subscribes (pass 27 swapped live numerics for static
  // dimension comparison copy). PreviewCard reads its own i18n locale
  // via useTranslation internally, so no isPt lifted here.
  const heroRate = useHeroRate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const openForm = () => setIsFormOpen(true);

  return (
    <div className="page-container bg-background">
      <SEO titleKey="home" path="/" />
      <Header
        showAuthButton={!user}
        username={user?.username}
        onLogout={handleLogout}
      />

      <main className="page-main">
        {/* Hero — 2-col, left copy + right PreviewCard. Option (b) per
            decision 8: the $1,000 offer pill is rendered as a bottom
            strip inside PreviewCard so the right column carries one
            more line of content and the left column reaches its
            natural height without stretching. */}
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            {/* 60/40 split on lg+, strict via minmax(0, fr) so the fr
                tracks don't expand when a nowrap child pushes min-content
                past the fr allocation (which would shrink the PreviewCard
                column). Ratio stays 3:2 exactly. */}
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-14">
              <div className="space-y-6">
                {/* Headline. The currency word (words[0] per locale)
                    cycles through a typewriter animation in mint.
                    Prefix/suffix come from splitting the canonical
                    heroTitle on that first word — no copy duplicated,
                    and the static fallback (prefers-reduced-motion)
                    shows the original sentence intact. A visually-
                    hidden supplement makes the semantic claim
                    ("and other major currencies") available to AT. */}
                {(() => {
                  const headline = t("business.heroTitle");
                  const currenciesRaw = t("business.heroCurrencies");
                  // Each entry in heroCurrencies is "name symbol"
                  // (e.g. "dollar $", "real R$"). The Typewriter cycles
                  // through the full entry so the symbol is part of
                  // the animation. For splitting the headline's
                  // prefix/suffix we use only the name portion (before
                  // the first space), since the headline itself
                  // doesn't carry the symbol.
                  const currencies = currenciesRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  const firstEntry = currencies[0] ?? "";
                  const spaceIdx = firstEntry.indexOf(" ");
                  const anchor =
                    spaceIdx > 0 ? firstEntry.slice(0, spaceIdx) : firstEntry;
                  const [prefix, ...rest] = anchor
                    ? headline.split(anchor)
                    : [headline];
                  const suffix = anchor ? rest.join(anchor) : "";
                  return (
                    // Size tokens match /platforms, /developers, and
                    // /what-is-hedge hero H1s exactly (text-4xl
                    // md:text-5xl lg:text-6xl + tracking-tight +
                    // leading[1.05] + font-display font-semibold).
                    //
                    // Two block segments. Segment A carries the
                    // prefix + cycling Typewriter word; segment B is
                    // the fixed tail ("at today's rate." / "de amanhã
                    // hoje."). Both are display:block, so segment B
                    // always starts on a new line regardless of
                    // viewport — no <br>, no width lock, no
                    // non-breaking space. Segment B is short enough
                    // that it never wraps into 2 lines.
                    //
                    // Segment A keeps lg:whitespace-nowrap +
                    // lg:tracking-tighter so the prefix+currency stay
                    // on a single line at lg+, where the column is
                    // ~562px and widest PT line 1 at default tracking
                    // runs ~640px. Tightening to -0.05em at lg brings
                    // PT to ~605px — overflows the column by ~43px
                    // into the 56px grid gutter, no overlap with the
                    // PreviewCard. Below lg the lg: classes drop off
                    // and segment A wraps naturally, producing 2 or 3
                    // total lines depending on viewport width (at
                    // 320px "Lock tomorrow's" and the currency may
                    // land on separate lines — accepted).
                    //
                    // suffix.trim() removes the leading space that
                    // split(anchor) puts in front of " at today's
                    // rate." — without the trim, that space would sit
                    // at the start of segment B's block and render as
                    // a visible indent.
                    <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                      <span className="block lg:whitespace-nowrap lg:tracking-tighter">
                        {prefix}
                        <Typewriter
                          words={currencies}
                          className="text-primary"
                          cursorClassName="bg-primary"
                        />
                      </span>
                      <span className="block">{suffix.trim()}</span>
                      <span className="sr-only">
                        {" "}
                        {t("business.heroAndOthersSr")}
                      </span>
                    </h1>
                  );
                })()}
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {t("business.heroSubtitle")}
                  {t("business.heroSubtitleTail") && (
                    <>
                      {" "}
                      <span className="xl:block">
                        {t("business.heroSubtitleTail")}
                      </span>
                    </>
                  )}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg">{t("business.requestAccess")}</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t("business.dialogTitle")}</DialogTitle>
                      </DialogHeader>
                      <AccessRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#how">{t("business.seeHow")}</a>
                  </Button>
                </div>
                {/* Cross-sell link — navy eyebrow + muted value-prop.
                    The eyebrow uses the site-wide uppercase + 0.18em
                    tracking register; the body + arrow share the
                    muted-to-foreground hover. Eyebrow keeps its navy
                    on hover (explicit text-accent-navy on the span
                    overrides the parent's hover:text-foreground).
                    Middle-dot separator matches the triptych "1 / 3 · "
                    pattern used elsewhere, and is hidden below sm so
                    the element wraps cleanly to two lines on narrow
                    viewports (eyebrow on its own line, body + arrow
                    below). */}
                <div>
                  <Link
                    href="/platforms"
                    className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                      {t("business.crossLinkPlatformsEyebrow")}
                    </span>
                    <span
                      aria-hidden="true"
                      className="hidden sm:inline"
                    >
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {t("business.crossLinkPlatformsBody")}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </div>
              </div>

              <div className="lg:py-4">
                <PreviewCard data={heroRate.data} isLive={heroRate.isLive} />
              </div>
            </div>
          </div>
        </section>

        {/* Personas — ContentCard with icons (Wallet / Ship / Briefcase).
            Moved above How it works so readers self-identify before
            seeing the mechanics. Tone flipped to muted to preserve the
            default→muted→default→muted→default→muted alternation with
            the hero, now that Transparency is the default-tone slot
            between Simulator and Final CTA. */}
        <Section tone="muted" density="default">
          <SectionHeader title={t("business.personasTitle")} />
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            <ContentCard
              icon={Wallet}
              title={t("business.personaCaioRole")}
              body={t("business.personaCaioStory")}
            />
            <ContentCard
              icon={Ship}
              title={t("business.personaMarinaRole")}
              body={t("business.personaMarinaStory")}
            />
            <ContentCard
              icon={Briefcase}
              title={t("business.personaRafaelRole")}
              body={t("business.personaRafaelStory")}
            />
          </div>
        </Section>

        {/* How it works — 4 step numbers with muted connector line
            behind the circles. Identical component pattern to the
            /platforms version; only the circle's "punch-through"
            border color differs because the background tone is
            different (default here, muted on /platforms). Anchor
            id="how" preserved so the hero's "See how" CTA still
            scrolls here. Vertical padding trimmed ~20% from the
            default compact density so the steps sit closer to the
            header. */}
        <Section id="how" density="compact" className="py-8 md:py-12">
          <SectionHeader
            title={t("business.howItWorksTitle")}
            subtitle={t("business.howItWorksSubtitle")}
          />
          <div className="mx-auto max-w-4xl">
            <div className="relative grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Opaque pale mint — #EAFDF8 is the pre-blended
                      equivalent of bg-primary/10 over the section's
                      white background. Using it (rather than the
                      translucent bg-primary/10 token) stops the
                      connector line from showing through the circle. */}
                  <div className="num-body relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-[#eafdf8] text-base font-semibold text-primary">
                    {n}
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground">
                    {t(`business.howStep${n}Title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(`business.howStep${n}Desc`)}
                  </p>
                </div>
              ))}

              {/* Muted connector line behind circles. Hidden below md
                  where steps stack into 2 cols. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-border md:block"
              />
            </div>
          </div>
        </Section>

        {/* Simulator + a tertiary link offering the "what is hedging?"
            primer for readers who want to back up one level before
            running numbers. Link style mirrors the hero's "Not a
            business?" cross-link. */}
        <Section tone="muted" density="default" width="wide">
          <SimulatorShell
            title={t("business.simulatorTitle")}
            subtitle={t("business.simulatorHelper")}
            innerWidth="5xl"
          >
            <BusinessSimulator />
          </SimulatorShell>
          <div className="mt-8 text-center">
            <Link
              href="/what-is-hedge"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
            >
              {t("business.newToHedging")}
            </Link>
          </div>
        </Section>

        {/* Transparency — three-beat intro (headline → pivot → 2-col
            problem/fix) followed by the four-dimension comparison
            cards. Moved below Simulator so pricing transparency reads
            as "here's exactly what you just saw" after the reader has
            touched real numbers. Default tone to keep alternation. */}
        <Section density="default" divider>
          {/* Beat 1: headline */}
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-[2.125rem] lg:text-4xl">
              {t("business.transparencyTitle")}
            </h2>
          </div>

          {/* Beat 2: 2-col problem/fix block (pivot line removed) */}
          <div className="mx-auto mb-12 grid max-w-4xl gap-10 md:grid-cols-2 md:gap-12">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                {t("business.transparency.intro.bank.eyebrow")}
              </div>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {t("business.transparency.intro.bank.body")}
              </p>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
                {t("business.transparency.intro.hedgi.eyebrow")}
              </div>
              <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                {t("business.transparency.intro.hedgi.body")}
              </p>
            </div>
          </div>

          {/* Four-dimension comparison cards. Extracted 2026-04-20
              into <PricingComparisonCard> so /what-is-hedge can reuse
              the exact same chrome for its São Paulo worked example.
              The 10-row template (2 header + 4 pairs × 2 rows) feeds
              the cards' subgrid so equivalent rows across the two
              cards stay level regardless of body copy length. */}
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:grid-rows-[repeat(10,auto)] md:gap-y-0">
            <PricingComparisonCard
              variant="muted"
              icon={EyeOff}
              eyebrow={t("business.transparencyBankLabel")}
              summary={t("business.transparency.bank.subhead")}
              rows={(["pricing", "speed", "access", "counterparty"] as const).map(
                (dim) => ({
                  label: t(`business.transparency.bank.${dim}.label`),
                  body: t(`business.transparency.bank.${dim}.value`),
                }),
              )}
            />
            <PricingComparisonCard
              variant="positive"
              icon={Eye}
              eyebrow={t("business.transparencyHedgiLabel")}
              summary={t("business.transparency.hedgi.subhead")}
              rows={(["pricing", "speed", "access", "counterparty"] as const).map(
                (dim) => ({
                  label: t(`business.transparency.hedgi.${dim}.label`),
                  body: t(`business.transparency.hedgi.${dim}.value`),
                }),
              )}
            />
          </div>
        </Section>

        {/* Final CTA — full-bleed navy panel. Background spans the
            viewport; inner content stays inside the standard
            container max-width. Sits directly above the footer with
            no divider — the navy-to-stone transition is the visual
            boundary. Headline is pure white; subhead / reassurance
            text / icons are muted white (white/70). Primary CTA
            keeps its mint styling — intentionally pops against navy.
            The $1,000 offer pill is adapted to a glass-on-navy look
            (white/8 fill, white/15 border, white text). The old
            "Approval in 24 hours. No credit card. No commitment."
            gray line is replaced by the three-item reassurance row
            directly below the badge. */}
        <Section
          tone="navy"
          className="py-16 md:py-24"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {t("business.finalCtaTitle")}
            </h2>
            <div className="mt-8 flex flex-col items-center gap-4">
              <Button size="lg" onClick={openForm}>
                {t("business.requestAccess")}
              </Button>
              {/* Final CTA pill uses the short variant — only
                  "Hedge up to $1,000 on us." The fuller framing
                  with the "you keep the gain" clause lives in the
                  hero preview card footer. */}
              <OfferPill className="border-white/15 bg-white/[0.08] text-white">
                {t("business.heroPillShort")}
              </OfferPill>
              <ul className="mt-2 flex flex-col items-center gap-3 text-sm text-white/70 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-12 sm:gap-y-2">
                <li className="flex items-center gap-2">
                  <Clock
                    aria-hidden="true"
                    className="h-4 w-4 text-white/70"
                  />
                  <span>{t("business.reassureFastApproval")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CreditCard
                    aria-hidden="true"
                    className="h-4 w-4 text-white/70"
                  />
                  <span>{t("business.reassureNoCard")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4 text-white/70"
                  />
                  <span>{t("business.reassureNoCommitment")}</span>
                </li>
              </ul>
            </div>
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
