import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import CurrencyNewsFeed from "@/components/CurrencyNewsFeed";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} />

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
        
        <section className="mt-32">
          <div className="container mx-auto px-4 lg:px-0">
            <div className="flex flex-col md:flex-row items-start">
              {/* Left Column: “Why Hedgi” */}
              <div className="text-2xl font-semibold text-primary whitespace-nowrap md:pr-8">
                Why Hedgi
              </div>

              {/* Vertical Divider (only on md+ screens) */}
              <div className="hidden md:block border-l border-gray-300 h-48 mx-4"  />

              {/* Right Column: Explanatory Text + CTA */}
              <div className="pt-4 md:pl-8 md:pt-0">
        

                <p className="text-xl text-gray-600 px-0 mb-6 w-full">
                  Sudden swings in major currency pairs can erode your budget.{" "}
                  <strong>Hedgi collects real-time pricing </strong> so you lock in
                  today’s rate and avoid tomorrow’s surprises. Rates can spike at
                  any hour—<strong>Hedgi continuously tracks global FX moves</strong>,
                  so whether it’s 2 AM or 2 PM, you can hedge when the window is best.
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
          <div className="mt-12">
            <CurrencyNewsFeed />
          </div>
          
        </section>
        
      </main>
    </div>
  );
}