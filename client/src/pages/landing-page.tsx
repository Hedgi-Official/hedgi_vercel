import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skyline } from "@/components/skyline";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { User, Building2, ArrowRight } from "lucide-react";
/*import CurrencyNewsFeed from "@/components/CurrencyNewsFeed"; */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [audienceType, setAudienceType] = useState<'individuals' | 'companies'>('individuals');
  const [lockedPadding, setLockedPadding] = useState<number | null>(null);

  // Refs
  const colRef = useRef<HTMLDivElement>(null);        // left column wrapper
  const scalerRef = useRef<HTMLSpanElement>(null);    // kept for structure; no transform now
  const h1Ref = useRef<HTMLHeadingElement>(null);     // headline at BASE size
  const line1Ref = useRef<HTMLSpanElement>(null);     // line 1
  const line2Ref = useRef<HTMLSpanElement>(null);     // line 2
  const skylineWrapRef = useRef<HTMLDivElement>(null);// Skyline wrapper
  const heroSectionRef = useRef<HTMLElement>(null);   // hero section for centering
  const hasLockedPadding = useRef(false);             // track if we've locked the padding

  // Track max observed line width per mode (mobile/desktop) to avoid jitter
  const maxLineMobile = useRef<number>(0);
  const maxLineDesktop = useRef<number>(0);
  
  // Lock the initial centered position on desktop so it doesn't shift when simulator expands
  useLayoutEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    
    const lockCenterPosition = () => {
      if (hasLockedPadding.current || !mql.matches) return;
      
      const heroSection = heroSectionRef.current;
      if (!heroSection) return;
      
      // Get the main content area height (viewport minus header and footer)
      const header = document.querySelector('nav');
      const footer = document.querySelector('footer');
      const headerHeight = header?.getBoundingClientRect().height || 56;
      const footerHeight = footer?.getBoundingClientRect().height || 48;
      const availableHeight = window.innerHeight - headerHeight - footerHeight;
      
      // Get the hero content height
      const heroContent = heroSection.querySelector('.container');
      const contentHeight = heroContent?.getBoundingClientRect().height || 0;
      
      // Calculate padding to center the content
      // Ensure minimum 5% of viewport height as top padding
      const minPadding = window.innerHeight * 0.05;
      const centeredPadding = (availableHeight - contentHeight) / 2;
      const padding = Math.max(minPadding, centeredPadding);
      
      setLockedPadding(padding);
      hasLockedPadding.current = true;
    };
    
    // Wait for fonts and layout to settle
    const timer = setTimeout(lockCenterPosition, 100);
    (document as any).fonts?.ready?.then(() => {
      setTimeout(lockCenterPosition, 50);
    });
    
    return () => clearTimeout(timer);
  }, []);

  // Preload hero image
  useEffect(() => {
    const heroImage = new Image();
    heroImage.src = "/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg";
  }, []);

  useEffect(() => {
    const BASE_PX = 96;   // measure at this base, then set actual font-size = BASE_PX * scale
    const SAFETY = 0.992;  // tiny margin so we never wrap
    const EPS = 0.75;      // subpixel buffer
    const mql = window.matchMedia("(min-width: 1024px)"); // tailwind lg
    
    // Get English translations for consistent measurement
    const tEn = i18n.getFixedT('en');
    const enLine1 = tEn('Protect the value');
    const enLine2 = tEn('of your') + ' USD'; // USD is the longest currency

    const isDesktop = () => mql.matches;

    const applyBase = () => {
      const h1 = h1Ref.current;
      if (!h1) return;
      const mobile = !isDesktop();
      h1.style.fontSize = `${BASE_PX}px`;         // set base for measuring
      h1.style.lineHeight = mobile ? "1.02" : "1.14";
    };

    const measureEnglishWidthAtBase = () => {
      const h1 = h1Ref.current;
      if (!h1) return 0;
      
      // Create hidden measurement element with same styling as h1
      const measureEl = document.createElement('span');
      measureEl.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font-size: ${BASE_PX}px;
        font-weight: bold;
        font-family: ${getComputedStyle(h1).fontFamily};
      `;
      
      // Measure English line 1
      measureEl.textContent = enLine1;
      document.body.appendChild(measureEl);
      const w1 = measureEl.getBoundingClientRect().width;
      
      // Measure English line 2
      measureEl.textContent = enLine2;
      const w2 = measureEl.getBoundingClientRect().width;
      
      document.body.removeChild(measureEl);
      
      const widest = Math.max(w1, w2) || 1;

      // cache per mode to avoid jitter
      if (isDesktop()) {
        maxLineDesktop.current = Math.max(maxLineDesktop.current, widest);
        return maxLineDesktop.current;
      } else {
        maxLineMobile.current = Math.max(maxLineMobile.current, widest);
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
      const widestLineAtBase = measureEnglishWidthAtBase();
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
    <div className="page-container-fit bg-background relative overflow-hidden">
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

      <main className="page-main relative z-10 lg:min-h-0">
        {/* Hero Section */}
        <section 
          ref={heroSectionRef}
          className="page-section-hero-landing relative overflow-hidden flex-1"
          style={lockedPadding !== null ? { paddingTop: `${lockedPadding}px` } : undefined}
        >
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[clamp(1rem,2vw,2rem)] items-start">
              {/* Left side - Hero content */}
              <div ref={colRef} className="text-center lg:text-left">
                <div className="mb-[clamp(0.75rem,1.5vh,1.5rem)]">
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
                      mt-[clamp(0.75rem,1.5vh,1.5rem)]
                      overflow-hidden
                      lg:[&>div>svg]:h-auto
                      [&>div]:mt-0
                      [&>div]:mb-1
                    "
                  >
                    <Skyline />
                  </div>
                </div>

                <p className="text-[clamp(1rem,1.25vw,1.25rem)] font-medium mb-[clamp(0.75rem,1.5vh,1.5rem)] text-foreground">
                  {t("landing.tagline")}
                </p>

                {/* Audience Toggle */}
                <div className="mb-[clamp(1rem,2vh,2rem)] max-w-lg mx-auto lg:mx-0">
                  <p className="text-[clamp(0.875rem,1vw,1rem)] font-semibold text-foreground mb-[clamp(0.5rem,1vh,0.75rem)] text-center lg:text-left">
                    {t("landing.audienceLabel")}
                  </p>
                  <div className="flex items-center gap-2 p-1.5 bg-muted rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAudienceType('individuals')}
                      className={`flex items-center gap-2 px-[clamp(0.75rem,1vw,1.25rem)] py-[clamp(0.375rem,0.75vh,0.625rem)] rounded-lg text-[clamp(0.875rem,1vw,1rem)] font-semibold transition-colors flex-1 justify-center ${
                        audienceType === 'individuals'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <User className="h-4 w-4" />
                      {t("landing.individuals")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceType('companies')}
                      className={`flex items-center gap-2 px-[clamp(0.75rem,1vw,1.25rem)] py-[clamp(0.375rem,0.75vh,0.625rem)] rounded-lg text-[clamp(0.875rem,1vw,1rem)] font-semibold transition-colors flex-1 justify-center ${
                        audienceType === 'companies'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <Building2 className="h-4 w-4" />
                      {t("landing.companies")}
                    </button>
                  </div>
                  <p className="text-[clamp(0.75rem,0.9vw,0.875rem)] text-foreground/80 mt-[clamp(0.375rem,0.75vh,0.5rem)] text-center lg:text-left leading-relaxed">
                    {audienceType === 'individuals' 
                      ? t("landing.individualsHelper")
                      : t("landing.companiesHelper")}
                  </p>
                </div>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-[clamp(0.5rem,1vh,0.75rem)]">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-[clamp(1.25rem,2vw,2rem)] py-[clamp(0.5rem,1vh,0.75rem)] text-[clamp(0.875rem,1vw,1rem)] w-full sm:w-auto"
                  >
                    {t("Start Hedging Now")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate(audienceType === 'individuals' ? '/for-individuals' : '/for-companies')}
                    className="px-[clamp(1rem,1.5vw,1.5rem)] py-[clamp(0.375rem,0.75vh,0.625rem)] text-[clamp(0.875rem,1vw,1rem)] font-semibold"
                  >
                    {audienceType === 'individuals' ? t("landing.forIndividuals") : t("landing.forCompanies")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Right side - Currency Simulator */}
              <div className="lg:mt-0 mt-6">
                <div className="bg-background rounded-2xl p-[clamp(1rem,2vw,1.5rem)] border border-border shadow-sm">
                  <CurrencySimulator showGraph={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
