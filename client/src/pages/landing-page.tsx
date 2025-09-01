import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useRef } from "react";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const [mobileFontSize, setMobileFontSize] = useState("3rem");

  // NEW: refs/state to force Skyline width = CTA width (mobile only)
  const ctaWrapRef = useRef<HTMLDivElement>(null);
  const [ctaWidth, setCtaWidth] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Preload hero image (unchanged)
  useEffect(() => {
    const heroImage = new Image();
    heroImage.src = "/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg";
  }, []);

  // Dynamic font sizing for mobile (unchanged)
  useEffect(() => {
    const calculateFontSize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        const containerWidth = window.innerWidth - 32;
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

  // NEW: measure CTA width and mirror it to Skyline wrapper on mobile
  useEffect(() => {
    const measure = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth < 640;
      setIsMobile(mobile);
      const w = ctaWrapRef.current?.getBoundingClientRect().width ?? 0;
      setCtaWidth(mobile && w ? Math.ceil(w) : undefined);
    };

    measure();

    const ro = ctaWrapRef.current ? new ResizeObserver(measure) : null;
    if (ctaWrapRef.current && ro) ro.observe(ctaWrapRef.current);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
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
        {/* Hero */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
              {/* Left column */}
              <div className="text-center lg:text-left">
                <div className="mb-6">
                  <h1
                    className="text-5xl sm:text-6xl md:text-6xl lg:text-6xl font-bold mb-0 sm:mb-1 leading-tight sm:leading-tight"
                    style={{
                      fontSize: typeof window !== "undefined" && window.innerWidth < 640 ? mobileFontSize : undefined,
                      lineHeight: typeof window !== "undefined" && window.innerWidth < 640 ? "1.1" : undefined,
                    }}
                  >
                    <span className="text-foreground block">{t("Protect the value")}</span>

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

                  {/* NEW: Skyline wrapper width mirrors CTA width on mobile */}
                  <div className="w-full text-center lg:text-left">
                    <div
                      className="
                        inline-block lg:block
                        [&>div]:!w-auto [&>div]:max-w-full [&>div]:mx-auto
                        [&>div>svg]:!w-auto [&>div>svg]:h-20 sm:[&>div>svg]:h-24 [&>div>svg]:max-w-full
                      "
                    >
                      <Skyline />
                    </div>
                  </div>

                </div>

                <p className="text-xl md:text-2xl font-medium mb-4 text-foreground">
                  The Simplest Way to Insure Your Money Against Unpredictable Markets.
                </p>
                <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-xl mx-auto lg:mx-0">
                  {t("Professional currency hedging made simple")}
                </p>

                {/* NEW: wrap CTA in a measurable box */}
                <div ref={ctaWrapRef} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg w-full sm:w-auto"
                  >
                    {t("Start Hedging Now")}
                  </Button>
                </div>
              </div>

              {/* Right column */}
              <div className="lg:mt-0 mt-8">
                <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                  <CurrencySimulator showGraph={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* …rest of the page unchanged… */}
      </main>
    </div>
  );
}
