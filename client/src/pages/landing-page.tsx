import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
/*import CurrencyNewsFeed from "@/components/CurrencyNewsFeed"; */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  // Preload only the first visible image
  useEffect(() => {
    // Only preload the hero image that's immediately visible
    const heroImage = new Image();
    heroImage.src = "/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg";
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Abstract Background Pattern */}
      <div className="absolute inset-0 opacity-5 -z-10">
        <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: "hsl(var(--primary))", stopOpacity: 0.3}} />
              <stop offset="50%" style={{stopColor: "hsl(120, 60%, 50%)", stopOpacity: 0.2}} />
              <stop offset="100%" style={{stopColor: "hsl(200, 60%, 50%)", stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
          {/* Abstract flowing lines representing financial data */}
          <path d="M0,200 Q250,100 500,180 T1000,150" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.6"/>
          <path d="M0,400 Q300,300 600,380 T1000,350" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.4"/>
          <path d="M0,600 Q200,500 400,580 T1000,550" stroke="url(#gradient1)" strokeWidth="2" fill="none" opacity="0.3"/>
          {/* Currency symbols scattered */}
          <text x="100" y="300" fontSize="24" fill="url(#gradient1)" opacity="0.3">$</text>
          <text x="800" y="200" fontSize="24" fill="url(#gradient1)" opacity="0.3">€</text>
          <text x="600" y="700" fontSize="24" fill="url(#gradient1)" opacity="0.3">R$</text>
          <text x="300" y="800" fontSize="24" fill="url(#gradient1)" opacity="0.3">¥</text>
        </svg>
      </div>

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section with Gradient Background */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-green-500/5 to-blue-500/5"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Hero content */}
              <div className="text-center lg:text-left">
                <div className="mb-6">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4">
                    <span className="bg-gradient-to-r from-primary via-green-600 to-blue-600 bg-clip-text text-transparent">
                      {t('Protect the value')}
                    </span>
                    <br />
                    <span className="text-foreground">{t('of your')} <TypingEffect /></span>
                  </h1>
                  <Skyline />
                </div>
                <p className="text-2xl md:text-3xl font-semibold mb-4 text-primary">
                  The Simplest Way to Insure Your Money Against Unpredictable Markets.
                </p>
                <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-xl mx-auto lg:mx-0">
                  {t('Professional currency hedging made simple')}
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
                >
                  {t('Start Hedging Now')}
                </Button>
              </div>

              {/* Right side - Currency Simulator */}
              <div className="lg:mt-0 mt-8">
                <div className="bg-gradient-to-br from-background/50 to-muted/30 rounded-2xl p-6 backdrop-blur-sm border border-primary/10">
                  <CurrencySimulator showGraph={false} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Value Proposition Section */}
        <section className="py-16 bg-gradient-to-r from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                  {t('lifestyle.tagline')}
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {t('lifestyle.description')}
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="group p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Instant Protection</h3>
                  <p className="text-muted-foreground">
                    Lock in today's exchange rates and protect your budget from unpredictable currency swings.
                  </p>
                </div>

                <div className="group p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10 hover:border-green-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Real-Time Monitoring</h3>
                  <p className="text-muted-foreground">
                    24/7 tracking of global markets ensures you can hedge when the window is best, any time of day.
                  </p>
                </div>

                <div className="group p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10 hover:border-blue-500/30 transition-all duration-300">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-foreground">Best Rates Guaranteed</h3>
                  <p className="text-muted-foreground">
                    Compare prices across brokers automatically to ensure you pay the lowest fees possible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Professional CTA Section */}
        <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Ready to Protect Your Money?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Stop losing money to currency fluctuations when buying from other countries.
                With <span className="font-semibold text-primary">Hedgi</span>, currency protection becomes as simple as
                getting insurance — automatic, affordable, and stress-free.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Get Currency Insurance
                </Button>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>or</span>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/using-hedgi")}
                  className="px-8 py-4 text-lg border-primary/20 hover:border-primary hover:bg-primary/5 transition-all duration-300"
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