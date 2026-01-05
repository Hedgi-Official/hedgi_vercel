import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skyline } from "@/components/skyline";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { User, Building2, ArrowRight, CheckCircle, Zap, DollarSign } from "lucide-react";
/*import CurrencyNewsFeed from "@/components/CurrencyNewsFeed"; */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [audienceType, setAudienceType] = useState<'individuals' | 'companies'>('individuals');

  // Refs
  const colRef = useRef<HTMLDivElement>(null);        // left column wrapper
  const scalerRef = useRef<HTMLSpanElement>(null);    // kept for structure; no transform now
  const h1Ref = useRef<HTMLHeadingElement>(null);     // headline at BASE size
  const line1Ref = useRef<HTMLSpanElement>(null);     // line 1
  const line2Ref = useRef<HTMLSpanElement>(null);     // line 2
  const skylineWrapRef = useRef<HTMLDivElement>(null);// Skyline wrapper

  // Track max observed line width per mode (mobile/desktop) to avoid jitter
  const maxLineMobile = useRef<number>(0);
  const maxLineDesktop = useRef<number>(0);

  // Preload hero image
  useEffect(() => {
    const heroImage = new Image();
    heroImage.src = "/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg";
  }, []);

  useEffect(() => {
    const BASE_PX = 120;   // measure at this base, then set actual font-size = BASE_PX * scale
    const SAFETY = 0.992;  // tiny margin so we never wrap
    const EPS = 0.75;      // subpixel buffer
    const mql = window.matchMedia("(min-width: 1024px)"); // tailwind lg

    const isDesktop = () => mql.matches;

    const applyBase = () => {
      const h1 = h1Ref.current;
      if (!h1) return;
      const mobile = !isDesktop();
      h1.style.fontSize = `${BASE_PX}px`;         // set base for measuring
      h1.style.lineHeight = mobile ? "1.02" : "1.14";
    };

    const measureLinesAtBase = () => {
      const l1 = line1Ref.current, l2 = line2Ref.current;
      if (!l1 || !l2) return 0;
      const prevWS1 = l1.style.whiteSpace;
      l1.style.whiteSpace = "nowrap"; // l2 already nowrap via classes

      const w1 = l1.getBoundingClientRect().width;
      const w2 = l2.getBoundingClientRect().width;
      const widest = Math.max(w1, w2) || 1;

      // cache per mode to avoid jitter from TypingEffect
      if (isDesktop()) {
        maxLineDesktop.current = Math.max(maxLineDesktop.current, widest);
        l1.style.whiteSpace = prevWS1;
        return maxLineDesktop.current;
      } else {
        maxLineMobile.current = Math.max(maxLineMobile.current, widest);
        l1.style.whiteSpace = prevWS1;
        return maxLineMobile.current;
      }
    };

    const skylineWidth = () => {
      // Desktop only: Skyline capped by lg:max-w-xl
      const wrap = skylineWrapRef.current;
      if (!wrap) return 0;
      const svg = wrap.querySelector("svg");
      return svg?.getBoundingClientRect().width || wrap.clientWidth || 0;
    };

    const columnWidth = () => colRef.current?.clientWidth || 0;

    const fit = () => {
      const h1 = h1Ref.current;
      if (!h1) return;

      // 1) Measure at base size
      applyBase();

      // 2) Pick target width by mode
      const targetWidth = isDesktop() ? skylineWidth() : columnWidth();
      const widestLineAtBase = measureLinesAtBase();
      if (!targetWidth || !widestLineAtBase) return;

      // 3) Compute scale and set ACTUAL font size
      const raw = ((targetWidth - EPS) / widestLineAtBase) * SAFETY;
      const scale = Math.min(1, Math.max(0.1, raw)); // clamp for sanity
      h1.style.fontSize = `${BASE_PX * scale}px`;
      // line-height already set in applyBase()
    };

    // initial + next frame (fonts/layout settle)
    applyBase();
    fit();
    const raf = requestAnimationFrame(fit);

    // Observe column and skyline (width changes)
    const roCol = new ResizeObserver(fit);
    const roSky = new ResizeObserver(fit);
    if (colRef.current) roCol.observe(colRef.current);
    if (skylineWrapRef.current) roSky.observe(skylineWrapRef.current);

    // Refit on resize/orientation
    const onResize = () => {
      applyBase();
      fit();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // Refit on breakpoint change; reset per-mode cache when switching
    const onMQ = () => {
      if (isDesktop()) {
        maxLineDesktop.current = 0; // recalc for desktop
      } else {
        maxLineMobile.current = 0;  // recalc for mobile
      }
      applyBase();
      fit();
    };
    mql.addEventListener?.("change", onMQ);

    // Refit when webfonts are ready (prevents late wrap)
    (document as any).fonts?.ready?.then(() => {
      maxLineMobile.current = 0;
      maxLineDesktop.current = 0;
      applyBase();
      fit();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      mql.removeEventListener?.("change", onMQ);
      roCol.disconnect();
      roSky.disconnect();
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-3 -z-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 0.1 }} />
              <stop offset="100%" style={{ stopColor: "hsl(var(--primary))", stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>
          <path d="M0,200 Q250,100 500,180 T1000,150" stroke="url(#gradient1)" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M0,600 Q200,500 400,580 T1000,550" stroke="url(#gradient1)" strokeWidth="1" fill="none" opacity="0.2" />
        </svg>
      </div>

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative py-10 md:py-16 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left side - Hero content */}
              <div ref={colRef} className="text-center lg:text-left">
                <div className="mb-6">
                  {/* Scaler wrapper (no transform) */}
                  <div className="w-full overflow-hidden">
                    <span ref={scalerRef} className="inline-block origin-center lg:origin-left">
                      <h1 ref={h1Ref} className="font-bold mb-0 sm:mb-1" style={{ fontSize: "96px", lineHeight: "1.14" }}>
                        <span ref={line1Ref} className="text-foreground block whitespace-nowrap">
                          {t("Protect the value")}
                        </span>

                        {/* mobile: centered as a unit; desktop: left; typing stays left-after “of your” */}
                        <span className="text-foreground block">
                          <span
                            ref={line2Ref}
                            className="
                              mx-auto lg:mx-0
                              inline-flex items-baseline gap-2
                              text-left whitespace-nowrap
                              [&>*]:inline-block [&>*]:shrink-0
                              [&_*]:text-left [&_*]:mx-0
                              -mt-0.5 sm:-mt-1
                            "
                          >
                            <span>{t("of your")}&nbsp;</span>
                            <TypingEffect />
                          </span>
                        </span>
                      </h1>
                    </span>
                  </div>

                  {/* Skyline: full width on mobile, capped on desktop */}
                  <div
                    ref={skylineWrapRef}
                    className="
                      mx-auto lg:mx-0
                      w-full lg:max-w-xl
                      mt-6 sm:mt-8
                      overflow-hidden
                      lg:[&>div>svg]:h-auto
                      [&>div]:mt-0
                      [&>div]:mb-2
                    "
                  >
                    <Skyline />
                  </div>
                </div>

                <p className="text-xl md:text-2xl font-medium mb-6 text-foreground">
                  {t("landing.tagline")}
                </p>

                {/* Audience Toggle */}
                <div className="mb-8 max-w-lg mx-auto lg:mx-0">
                  <p className="text-base md:text-lg font-semibold text-foreground mb-4 text-center lg:text-left">
                    {t("landing.audienceLabel")}
                  </p>
                  <div className="flex items-center gap-2 p-1.5 bg-muted rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAudienceType('individuals')}
                      className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base md:text-lg font-semibold transition-colors flex-1 justify-center ${
                        audienceType === 'individuals'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <User className="h-5 w-5" />
                      {t("landing.individuals")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceType('companies')}
                      className={`flex items-center gap-2 px-5 py-3 rounded-lg text-base md:text-lg font-semibold transition-colors flex-1 justify-center ${
                        audienceType === 'companies'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                      {t("landing.companies")}
                    </button>
                  </div>
                  <p className="text-sm md:text-base text-foreground/80 mt-3 text-center lg:text-left leading-relaxed">
                    {audienceType === 'individuals' 
                      ? t("landing.individualsHelper")
                      : t("landing.companiesHelper")}
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg w-full sm:w-auto"
                  >
                    {t("Start Hedging Now")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(audienceType === 'individuals' ? '/for-individuals' : '/for-companies')}
                    className="px-6 py-3 text-base md:text-lg font-semibold"
                  >
                    {audienceType === 'individuals' ? t("landing.forIndividuals") : t("landing.forCompanies")}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Right side - Currency Simulator */}
              <div className="lg:mt-0 mt-8">
                <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                  <CurrencySimulator showGraph={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.instantProtection")}</h3>
                <p className="text-muted-foreground">
                  {t("landing.instantProtectionDesc")}
                </p>
              </div>

              <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.realTimeMonitoring")}</h3>
                <p className="text-muted-foreground">
                  {t("landing.realTimeMonitoringDesc")}
                </p>
              </div>

              <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.transparentPricing")}</h3>
                <p className="text-muted-foreground">
                  {t("landing.transparentPricingDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section with Audience Toggle */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                {t("landing.bottomCtaTitle")}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t("landing.bottomCtaBody")}
              </p>

              {/* Audience Toggle */}
              <div className="inline-flex items-center rounded-xl border border-border p-1.5 bg-muted/30 mb-8">
                <button
                  onClick={() => setAudienceType('individuals')}
                  className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                    audienceType === 'individuals'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {t("landing.individuals")}
                </button>
                <button
                  onClick={() => setAudienceType('companies')}
                  className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                    audienceType === 'companies'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {t("landing.companies")}
                </button>
              </div>

              {/* Dynamic CTA Button */}
              <div className="flex justify-center items-center mb-6">
                {audienceType === 'individuals' ? (
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                  >
                    {t("cta.Get Currency Insurance")}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate("/for-companies")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                  >
                    {t("landing.viewApiQuickstart")}
                  </Button>
                )}
              </div>

              {/* Helper Text */}
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                {t("landing.bottomCtaHelper")}
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
