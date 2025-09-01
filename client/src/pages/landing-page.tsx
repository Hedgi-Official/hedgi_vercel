import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";
/*import CurrencyNewsFeed from "@/components/CurrencyNewsFeed"; */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const [mobileFontSize, setMobileFontSize] = useState("3rem");
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Preload only the first visible image
  useEffect(() => {
    const heroImage = new Image();
    heroImage.src = "/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg";
  }, []);

  // Dynamic font sizing for mobile to ensure 2-line layout
  useEffect(() => {
    const calculateFontSize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        const containerWidth = window.innerWidth - 32; // padding
        const textLength = 17;
        const charWidthRatio = 0.55;
        const optimalFontSize = containerWidth / (textLength * charWidthRatio);
        const finalSize = Math.max(28, Math.min(optimalFontSize, 52));
        setMobileFontSize(`${finalSize}px`);
      } else {
        setMobileFontSize("3rem");
      }
    };
    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    window.addEventListener("orientationchange", calculateFontSize);
    return () => {
      window.removeEventListener("resize", calculateFontSize);
      window.removeEventListener("orientationchange", calculateFontSize);
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
          {/* Subtle flowing lines */}
          <path d="M0,200 Q250,100 500,180 T1000,150" stroke="url(#gradient1)" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M0,600 Q200,500 400,580 T1000,550" stroke="url(#gradient1)" strokeWidth="1" fill="none" opacity="0.2" />
        </svg>
      </div>

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
              {/* Left side - Hero content */}
              <div className="text-center lg:text-left">
                <div className="mb-6">
                  <h1
                    ref={titleRef}
                    className="text-5xl sm:text-6xl md:text-6xl lg:text-6xl font-bold mb-0 sm:mb-1"
                    style={{
                      fontSize:
                        typeof window !== "undefined" && window.innerWidth < 640 ? mobileFontSize : undefined,
                      // tighter than before
                      lineHeight:
                        typeof window !== "undefined" && window.innerWidth < 640 ? "1.02" : "1.14",
                    }}
                  >
                    <span className="text-foreground block">
                      {t("Protect the value")}
                    </span>

                    {/* Center the whole line; keep typing left-justified after 'of your' */}
                    <span className="text-foreground block">
                      <span
                        className="
                          mx-auto lg:mx-0
                          inline-flex items-baseline gap-2
                          text-left whitespace-nowrap
                          [&>*]:inline-block [&>*]:shrink-0
                          [&_*]:text-left [&_*]:mx-0
                        "
                      >
                        <span>{t("of your")}</span>
                        <TypingEffect />
                      </span>
                    </span>
                  </h1>

                  {/* Skyline: bigger gap above it, smaller gap below it, cap width on lg+ */}
                  <div
                    className="
                      mx-auto lg:mx-0
                      w-full max-w-xl
                      mt-6 sm:mt-8            /* larger gap from the headline */
                      overflow-hidden
                      lg:[&>div>svg]:h-auto   /* keep aspect on desktop cap */
                      [&>div]:mt-0            /* nuke Skyline.tsx mt-1 */
                      [&>div]:mb-2            /* smaller gap to subheadline */
                    "
                  >
                    <Skyline />
                  </div>
                </div>

                <p className="text-xl md:text-2xl font-medium mb-4 text-foreground">
                  The Simplest Way to Insure Your Money Against Unpredictable Markets.
                </p>
                <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-xl mx-auto lg:mx-0">
                  {t("Professional currency hedging made simple")}
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg w-full sm:w-auto"
                >
                  {t("Start Hedging Now")}
                </Button>
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

        {/* Trust & People Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  {t("lifestyle.tagline")}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t("lifestyle.description")}
                </p>
              </div>

              {/* People Images for Trust */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                <div className="relative rounded-xl overflow-hidden aspect-square">
                  <img
                    src="/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg"
                    alt="Happy customers using Hedgi"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-square">
                  <img
                    src="/images/woman-9193216_640.jpg"
                    alt="Professional using currency protection"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-square">
                  <img
                    src="/images/family-1542595_640.jpg"
                    alt="Family securing their financial future"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
                <div className="relative rounded-xl overflow-hidden aspect-square">
                  <img
                    src="/images/gautham-krishna-fy466BrLmgg-unsplash_1750022560441-min.jpg"
                    alt="Experienced investor with peace of mind"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                </div>
              </div>

              {/* Clean Feature Grid */}
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{t("features.Instant Protection")}</h3>
                  <p className="text-muted-foreground">
                    {t("features.instantProtectionDesc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{t("features.Real-Time Monitoring")}</h3>
                  <p className="text-muted-foreground">
                    {t("features.realTimeMonitoringDesc")}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                      />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">{t("features.Best Rates Guaranteed")}</h3>
                  <p className="text-muted-foreground">
                    {t("features.bestRatesGuaranteedDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Clean CTA Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">{t("cta.Ready to Protect Your Money?")}</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t("cta.ctaDescription")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                >
                  {t("cta.Get Currency Insurance")}
                </Button>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>or</span>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/using-hedgi")}
                  className="px-8 py-4 text-lg"
                >
                  {t("How To Use Hedgi")}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
