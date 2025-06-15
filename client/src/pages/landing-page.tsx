import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
/*import CurrencyNewsFeed from "@/components/CurrencyNewsFeed"; */

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left side - Hero content */}
          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">
              {t('Protect the value')}
              <br />
              {t('of your')} <TypingEffect />
            </h1>
            <Skyline />
            <p className="text-xl mb-8 text-muted-foreground max-w-xl">
              {t('Professional currency hedging made simple')}
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t('Start Hedging Now')}
            </Button>
          </div>

          {/* Right side - Currency Simulator */}
          <div className="lg:mt-0">
            <CurrencySimulator showGraph={false} />
          </div>
        </div>
        
        {/* Lifestyle Trust Section */}
        <section className="mt-32 mb-16">
          <div className="relative w-full h-[500px] rounded-2xl overflow-hidden shadow-2xl">
            {/* Background Image Collage using SVG */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50">
              <svg className="w-full h-full object-cover" viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg">
                {/* Cafe scene with laptop */}
                <rect x="0" y="0" width="400" height="500" fill="url(#cafeGradient)" />
                <circle cx="200" cy="250" r="80" fill="#4F46E5" opacity="0.1" />
                <rect x="150" y="220" width="100" height="60" rx="8" fill="#6366F1" opacity="0.8" />
                <rect x="160" y="230" width="80" height="40" rx="4" fill="#E0E7FF" />
                
                {/* Travel/airplane silhouette */}
                <rect x="400" y="0" width="400" height="500" fill="url(#skyGradient)" />
                <path d="M500 200 L520 190 L650 200 L680 190 L700 200 L680 210 L650 220 L520 210 Z" fill="#1E40AF" opacity="0.6" />
                <circle cx="600" cy="150" r="40" fill="#FEF3C7" opacity="0.8" />
                
                {/* Remote work/relaxation scene */}
                <rect x="800" y="0" width="400" height="500" fill="url(#relaxGradient)" />
                <circle cx="1000" cy="200" r="60" fill="#10B981" opacity="0.2" />
                <rect x="950" y="180" width="100" height="40" rx="20" fill="#059669" opacity="0.6" />
                <circle cx="1100" cy="300" r="30" fill="#F59E0B" opacity="0.4" />
                
                {/* Happy people silhouettes */}
                <circle cx="200" cy="180" r="25" fill="#4338CA" opacity="0.7" />
                <rect x="185" y="205" width="30" height="60" rx="15" fill="#4338CA" opacity="0.7" />
                
                <circle cx="600" cy="320" r="25" fill="#0891B2" opacity="0.7" />
                <rect x="585" y="345" width="30" height="60" rx="15" fill="#0891B2" opacity="0.7" />
                
                <circle cx="1000" cy="350" r="25" fill="#059669" opacity="0.7" />
                <rect x="985" y="375" width="30" height="60" rx="15" fill="#059669" opacity="0.7" />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="cafeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FEF3C7" />
                    <stop offset="100%" stopColor="#FDE68A" />
                  </linearGradient>
                  <linearGradient id="skyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DBEAFE" />
                    <stop offset="100%" stopColor="#BFDBFE" />
                  </linearGradient>
                  <linearGradient id="relaxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#D1FAE5" />
                    <stop offset="100%" stopColor="#A7F3D0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Content Overlay */}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="text-center text-white max-w-4xl px-8">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  {t('lifestyle.tagline')}
                </h2>
                <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto leading-relaxed">
                  {t('lifestyle.description')}
                </p>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-4 h-4 bg-white/30 rounded-full animate-pulse"></div>
            <div className="absolute top-20 right-16 w-6 h-6 bg-white/20 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute bottom-16 left-20 w-3 h-3 bg-white/40 rounded-full animate-pulse delay-500"></div>
            <div className="absolute bottom-10 right-10 w-5 h-5 bg-white/25 rounded-full animate-pulse delay-1500"></div>
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