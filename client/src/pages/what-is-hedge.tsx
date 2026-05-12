import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDown,
  Building2,
  DollarSign,
  Lock,
  Shield,
  TrendingDown,
} from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { BusinessSimulator } from "@/components/business-simulator";
import {
  ContentCard,
  NavCard,
  OfferPill,
  PricingComparisonCard,
  Section,
  SectionHeader,
  SimulatorShell,
} from "@/components/marketing";
import { useHeroRate } from "@/hooks/use-hero-rate";
import { formatRate } from "@/lib/format-rate";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

/**
 * Box-Muller transform. Draws one sample from a normal distribution
 * centered on `mean` with the given `stddev`. Used by the hero
 * comparison card to cycle the UNHEDGED value around the live base
 * rate — normally-distributed draws cluster around the base, which
 * reads as "probably around here, but who knows" rather than the
 * uniform chaos of `Math.random() * range`.
 */
function gaussian(mean: number, stddev: number): number {
  const u1 = Math.random() || 1e-9; // guard against log(0)
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

/** Resample until the draw falls within [base - clamp, base + clamp].
 *  Resampling (vs. hard-clipping) preserves the bell shape at the tails
 *  instead of piling draws on the clamp boundary. */
function sampleClamped(base: number, stddev: number, clamp: number): number {
  for (let i = 0; i < 8; i++) {
    const v = gaussian(base, stddev);
    if (v >= base - clamp && v <= base + clamp) return v;
  }
  return base; // fallback if we somehow can't land in bounds
}

interface HeroCompareCardProps {
  /**
   * The rate-plus-markup ("breakeven") value from useHeroRate. This
   * is the rate the reader would actually lock in — matching what the
   * /business PreviewCard surfaces as "you pay" — not the raw
   * mid-market rate.
   */
  base: number;
  isLive: boolean;
  isPt: boolean;
}

/**
 * Right-side hero artifact on /what-is-hedge. Two-row comparison: the
 * HEDGED value holds steady at the live rate-plus-markup; the UNHEDGED
 * value cycles through normally-distributed randomized offsets
 * centered on `base + 0.1` (the "typical adverse drift" a reader
 * would experience without hedging).
 *
 * Chrome mirrors the /business PreviewCard ("LIVE QUOTE") — same
 * rounded-2xl + border + shadow + mint-tinted offer strip footer —
 * so the two cards read as siblings.
 *
 * Motion guardrails: respects prefers-reduced-motion (freezes on
 * unhedgedCenter + 0.08), pauses while the card is scrolled out of
 * view (IntersectionObserver), pauses when the tab is hidden. The
 * HEDGED value never animates.
 */
function HeroCompareCard({ base, isLive, isPt }: HeroCompareCardProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  // Bell curve centers ABOVE the hedged value — the narrative is
  // "without hedging, your expected outcome drifts against you."
  // Center at base + 0.15; the ±0.30 clamp around that center means
  // resamples fall in [base − 0.15, base + 0.45] — the range is
  // skewed upward so most draws sit worse than the locked rate, but
  // can still dip a bit below it on the lucky side.
  const unhedgedCenter = base + 0.15;

  const [reducedMotion, setReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [tabVisible, setTabVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden,
  );
  const [unhedgedValue, setUnhedgedValue] = useState(
    () => unhedgedCenter + 0.08,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    // Reduced-motion: freeze on a single representative offset so the
    // argument still lands without motion.
    if (reducedMotion) {
      setUnhedgedValue(unhedgedCenter + 0.08);
      return;
    }
    // Pause the cycle when the card isn't visible or the tab is hidden.
    if (!isVisible || !tabVisible) return;

    // 1500ms cadence — slower than the original 900ms. Reads as
    // "uncertainty over time" rather than a slot-machine.
    const tick = () => {
      setUnhedgedValue(sampleClamped(unhedgedCenter, 0.1, 0.3));
    };
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, [unhedgedCenter, reducedMotion, isVisible, tabVisible]);

  const hedgedDisplay = formatRate(base, isPt);
  const unhedgedDisplay = formatRate(unhedgedValue, isPt);

  return (
    <div
      ref={cardRef}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="p-6 md:p-7">
        {/* Header — eyebrow + live indicator, same chrome as the
            /business LIVE QUOTE card header. */}
        <div className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {t("whatIsHedging.card.pairLabel")} ·{" "}
            {t("whatIsHedging.card.horizonLabel")}
          </span>
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
        </div>

        {/* HEDGED row — never animates. Lock icon + neutral-dark
            4-decimal value pulling directly from the live base. */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
              {t("whatIsHedging.hero.hedgedLabel")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("whatIsHedging.hero.hedgedIndicator")}
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <Lock
              aria-hidden="true"
              className="h-3.5 w-3.5 translate-y-[1px] text-primary"
            />
            <span className="num-body text-lg font-semibold tabular-nums text-foreground">
              {hedgedDisplay}
            </span>
          </div>
        </div>

        {/* UNHEDGED row — value cycles every 900ms via Box-Muller
            draws clamped to base ± 0.30. key=unhedgedDisplay so the
            span remounts and the 200ms opacity-dip animation
            restarts on each update (no digit-level animation). */}
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
              {t("whatIsHedging.hero.unhedgedLabel")}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("whatIsHedging.hero.unhedgedIndicator")}
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <ArrowDown
              aria-hidden="true"
              className="h-3.5 w-3.5 translate-y-[1px] text-muted-foreground"
            />
            <span
              key={unhedgedDisplay}
              className="num-body fade-dip text-lg font-semibold tabular-nums text-muted-foreground"
            >
              {unhedgedDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Offer strip — mint-tinted footer, same slot the /business
          card uses for the $1,000 heroPill. Carries a single line of
          teaching microcopy here. */}
      <div className="border-t border-primary/20 bg-primary/5 px-6 py-3.5 text-center md:px-7">
        <span className="text-sm font-medium text-foreground">
          {t("whatIsHedging.card.footerMicrocopy")}
        </span>
      </div>
    </div>
  );
}

export default function WhatIsHedge() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  // Live USD/BRL rate from the same source the /business hero
  // PreviewCard uses. Before the first fetch resolves, the hook's
  // FALLBACK value (5.2345) renders — matching the Businesses card's
  // treatment (no skeleton; fallback shown until the live value
  // arrives, then swapped in seamlessly).
  const heroRate = useHeroRate();
  const isPt = i18n.language.startsWith("pt");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("whatIsHedging.title"),
        acceptedAnswer: {
          "@type": "Answer",
          text: t("whatIsHedging.heroParagraph"),
        },
      },
      {
        "@type": "Question",
        name: t("whatIsHedging.businessTitle"),
        acceptedAnswer: {
          "@type": "Answer",
          text:
            t("whatIsHedging.businessSubtitle") +
            " " +
            t("whatIsHedging.businessFooter"),
        },
      },
    ],
  };

  return (
    <div className="page-container">
      <SEO titleKey="whatIsHedge" path="/what-is-hedge" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header
        showAuthButton={!user}
        username={user?.username}
        onLogout={handleLogout}
      />

      <main className="page-main">
        {/* Hero — split layout matching /developers and /platforms:
            copy column on the left, live artifact on the right.
            Pattern (section.page-section-hero-subpage + container +
            2-col grid at lg) is lifted directly from those pages so
            the three hero architectures stay consistent. Left column
            holds the definition + pullquote that used to live below
            the old full-width hero; right column holds the new
            <HeroCompareCard>. */}
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                  {t("whatIsHedging.title")}
                </h1>
                <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                  {t("whatIsHedging.heroParagraph")}
                </p>
                <p className="text-base font-semibold text-foreground md:text-lg">
                  {t("whatIsHedging.heroHelper")}
                </p>
              </div>

              <div className="lg:py-4">
                <HeroCompareCard
                  base={heroRate.data.breakevenRate}
                  isLive={heroRate.isLive}
                  isPt={isPt}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Worked example — moved above the personas section to
            ground the abstract hero definition in concrete numbers
            before the reader has to find themselves in a persona.
            Uses the ContrastCard metric pattern; page-scoped i18n
            keys (whatIsHedging.storyCase*) keep this instance
            independent of the archived /platforms original at
            pages/archive/platforms-story-case.tsx. */}
        <Section tone="muted" density="default">
          <SectionHeader
            title={t("whatIsHedging.storyCaseTitle")}
            subtitle={t("whatIsHedging.storyCaseSubtitle")}
          />
          {/* 6-row template (2 header + 2 pairs × 2 rows) feeds the
              cards' subgrid so "Cost" / "Why" labels stay level
              across the Without/With columns regardless of body
              length. See components/marketing/pricing-comparison-card. */}
          <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2 md:grid-rows-[repeat(6,auto)] md:gap-y-0">
            <PricingComparisonCard
              variant="negative"
              icon={TrendingDown}
              eyebrow={t("whatIsHedging.storyCaseWithoutLabel")}
              summary={t("whatIsHedging.storyCaseWithoutBody")}
              rows={[
                {
                  label: t("whatIsHedging.storyCaseWithoutCostLabel"),
                  body: t("whatIsHedging.storyCaseWithoutCostBody"),
                },
                {
                  label: t("whatIsHedging.storyCaseWithoutWhyLabel"),
                  body: t("whatIsHedging.storyCaseWithoutWhyBody"),
                },
              ]}
            />
            <PricingComparisonCard
              variant="positive"
              icon={Shield}
              eyebrow={t("whatIsHedging.storyCaseWithLabel")}
              summary={t("whatIsHedging.storyCaseWithBody")}
              rows={[
                {
                  label: t("whatIsHedging.storyCaseWithCostLabel"),
                  body: t("whatIsHedging.storyCaseWithCostBody"),
                },
                {
                  label: t("whatIsHedging.storyCaseWithWhyLabel"),
                  body: t("whatIsHedging.storyCaseWithWhyBody"),
                },
              ]}
            />
          </div>
        </Section>

        {/* Personas — moved below the worked example so segment
            identification follows the concrete cost reveal.
            Flows directly into the Simulator below ("here's who
            does this → now you try it"). Derivatives footnote
            stays removed. */}
        <Section density="default">
          <SectionHeader
            title={t("whatIsHedging.businessTitle")}
            subtitle={t("whatIsHedging.businessSubtitle")}
          />
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            <ContentCard
              icon={Building2}
              title={t("whatIsHedging.importExport")}
              body={t("whatIsHedging.importExportDesc")}
            />
            <ContentCard
              icon={DollarSign}
              title={t("whatIsHedging.globalPayroll")}
              body={t("whatIsHedging.globalPayrollDesc")}
            />
            <ContentCard
              icon={Shield}
              title={t("whatIsHedging.platforms")}
              body={t("whatIsHedging.platformsDesc")}
            />
          </div>
        </Section>

        {/* Simulator — same BusinessSimulator as /business. The
            former standalone "hedge has a cost, like insurance"
            paragraph is folded into the SimulatorShell subtitle
            so it reads as the setup for the tool rather than a
            floating sentence. */}
        <Section tone="muted" density="default">
          <SimulatorShell
            title={t("business.simulatorTitle")}
            subtitle={t("whatIsHedging.simulatorSubtitle")}
          >
            <BusinessSimulator />
          </SimulatorShell>
        </Section>

        {/* Where to next? — dark navy panel, matching the closing
            beat on /business, /developers, and /platforms. Section
            header text is explicitly white / white-70 (SectionHeader
            defaults to text-foreground, which would read as dark on
            navy, so we inline the header block here). NavCards keep
            their white card chrome (mint eyebrow still legible on
            white; body/CTA stay at their default dark-on-white
            register). Padding matches the other final-CTA panels:
            py-16 md:py-24. */}
        <Section tone="navy" className="py-16 md:py-24">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white md:text-[2.125rem] lg:text-4xl">
              {t("whatIsHedging.pathNavTitle")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/70 md:text-lg">
              {t("whatIsHedging.pathNavSubtitle")}
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            <NavCard
              href="/"
              eyebrow={t("whatIsHedging.pathBusinessRole")}
              body={t("whatIsHedging.pathBusinessDesc")}
              cta={t("whatIsHedging.pathBusinessCta")}
              pill={<OfferPill>{t("whatIsHedging.pathBusinessPill")}</OfferPill>}
            />
            <NavCard
              href="/platforms"
              eyebrow={t("whatIsHedging.pathPlatformsRole")}
              body={t("whatIsHedging.pathPlatformsDesc")}
              cta={t("whatIsHedging.pathPlatformsCta")}
            />
            <NavCard
              href="/developers"
              eyebrow={t("whatIsHedging.pathDevelopersRole")}
              body={t("whatIsHedging.pathDevelopersDesc")}
              cta={t("whatIsHedging.pathDevelopersCta")}
            />
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
