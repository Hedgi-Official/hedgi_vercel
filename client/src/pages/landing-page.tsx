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
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8 md:py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left side - Hero content */}
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              {t('Protect the value')}
              <br />
              {t('of your')} <TypingEffect />
            </h1>
            <Skyline />
            <p className="text-lg md:text-xl mb-8 text-muted-foreground max-w-xl">
              {t('Professional currency hedging made simple')}
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            >
              {t('Start Hedging Now')}
            </Button>
          </div>

          {/* Right side - Currency Simulator */}
          <div className="lg:mt-0 mt-8">
            <CurrencySimulator showGraph={false} />
          </div>
        </div>

        {/* Lifestyle Trust Section */}
        <section className="mt-32 mb-16">
          <div className="relative w-full min-h-[600px] rounded-2xl overflow-hidden shadow-2xl">
            {/* Image Collage Grid */}
            <div className="absolute inset-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              {/* Couple picnic - relaxed happiness */}
              <div className="relative overflow-hidden">
                <img
                  src="/images/jarritos-mexican-soda-OXerfDPf6mk-unsplash_1750022560440-min.jpg"
                  alt="Happy couple enjoying a picnic"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="eager"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
              </div>

              {/* Laughing man in nature - confidence */}
              <div className="relative overflow-hidden">
                <img
                  src="/images/kenzie-kraft-9RZ7s4kEv54-unsplash_1750022560441.jpg"
                  alt="Confident man laughing outdoors"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
              </div>

              {/* Family walking - security and future */}
              <div className="relative overflow-hidden">
                <img
                  src="/images/jessica-rockowitz-5NLCaz2wJXE-unsplash_1750022560441-min.jpg"
                  alt="Family walking together in nature"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  style={{ objectPosition: 'center 25%' }}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
              </div>

              {/* Golfer - pursuing passions */}
              <div className="relative overflow-hidden md:col-span-1 lg:col-span-2">
                <img
                  src="/images/courtney-cook-SsIIw_MET0E-unsplash_1750022560441-min.jpg"
                  alt="Person playing golf, pursuing hobbies"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  style={{ objectPosition: 'center 65%' }}
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 66vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
              </div>

              {/* Senior enjoying life - wisdom and contentment */}
              <div className="relative overflow-hidden md:col-span-1 lg:col-span-1">
                <img
                  src="/images/gautham-krishna-fy466BrLmgg-unsplash_1750022560441-min.jpg"
                  alt="Senior person enjoying peaceful moment"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent"></div>
              </div>
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-0 flex items-center justify-center"
                 style={{
                   background: 'linear-gradient(rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0.45))'
                 }}>
              <div className="text-center text-gray-900 max-w-4xl px-8">
                <h2 className="text-4xl md:text-6xl font-bold mb-10 leading-tight drop-shadow-sm whitespace-pre-line">
                  {t('lifestyle.tagline')}
                </h2>
                <p className="text-xl md:text-2xl opacity-95 max-w-3xl mx-auto leading-relaxed text-shadow-lg"
                   style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.3), 0 0 8px rgba(255, 255, 255, 0.8)' }}>
                  {t('lifestyle.description')}
                </p>
              </div>
            </div>

            {/* Subtle decorative elements */}
            <div className="absolute top-8 left-8 w-3 h-3 bg-white/40 rounded-full animate-pulse"></div>
            <div className="absolute top-16 right-12 w-2 h-2 bg-white/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-12 left-16 w-2 h-2 bg-white/35 rounded-full animate-pulse delay-500"></div>
            <div className="absolute bottom-8 right-8 w-3 h-3 bg-white/40 rounded-full animate-pulse delay-1500"></div>
          </div>
        </section>

        {/* TEMPORARILY HIDDEN - Why Hedgi Section */}
        {false && (
          <section className="mt-32">
            <div className="container mx-auto px-4 lg:px-0">
              <div className="flex flex-col md:flex-row items-start">
                {/* Left Column: "Why Hedgi" */}
                <div className="text-2xl font-semibold text-primary whitespace-nowrap md:pr-8">
                  Why Hedgi
                </div>

                {/* Vertical Divider (only on md+ screens) */}
                <div className="hidden md:block border-l border-gray-300 h-48 mx-4" />

                {/* Right Column: Explanatory Text + CTA */}
                <div className="pt-4 md:pl-8 md:pt-0">
                  <p className="text-xl text-gray-600 px-0 mb-6 w-full">
                    Sudden swings in major currency pairs can erode your budget.{" "}
                    <strong>Hedgi collects real-time pricing </strong> so you lock in
                    today's rate and avoid tomorrow's surprises. Rates can spike at
                    any hour—<strong>Hedgi continuously tracks global FX moves</strong>,
                    so whether it's 2 AM or 2 PM, you can hedge when the window is best.
                    Hedgi also compare the prices at different brokers guranteeing you pay the lowest fee's   possible no matter what your hedge looks like.
                  </p>

                  <Button
                    size="lg"
                    onClick={() => navigate("/using-hedgi")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {t("How To Use Hedgi")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* END TEMPORARILY HIDDEN - Why Hedgi Section */}

      </main>
    </div>
  );
}