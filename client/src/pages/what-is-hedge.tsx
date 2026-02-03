import { useTranslation } from "react-i18next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Building2, 
  GraduationCap, 
  Home, 
  Luggage, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  ArrowDown,
  Check
} from "lucide-react";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

export default function WhatIsHedge() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="page-container">
      <SEO 
        title="What is Currency Hedging"
        description="Learn how currency hedging protects your international payments from exchange rate fluctuations. Understand hedging strategies for businesses and individuals."
        path="/what-is-hedge"
      />
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      
      <main className="page-main">
        {/* Hero Section */}
        <section className="page-section-hero-subpage bg-gradient-to-b from-background to-muted px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">{t("whatIsHedging.title")}</h1>
          
          {/* Currency animation visual */}
          <div className="flex justify-center items-center mb-8 py-6">
            <div className="relative flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 rounded-lg bg-card shadow-md">
              <div className="text-xl sm:text-2xl md:text-3xl font-bold text-primary flex items-center">
                <span>USD</span>
                <div className="mx-2 sm:mx-4 flex flex-col">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-primary animate-pulse" />
                  <TrendingDown className="h-4 w-4 sm:h-6 sm:w-6 text-destructive animate-pulse" />
                </div>
                <span>BRL</span>
              </div>
              <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 rotate-90 sm:rotate-0" />
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                <div className="text-xl sm:text-2xl md:text-3xl font-bold">
                  <span>USD</span>
                  <span className="mx-2">=</span>
                  <span>BRL</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-lg md:text-xl text-justify mb-4">
            {t("whatIsHedging.heroParagraph")}
          </p>
          <p className="text-sm md:text-base font-semibold text-foreground text-center mb-8">
            {t("whatIsHedging.heroHelper")}
          </p>
        </div>
      </section>
      
      {/* Institutional Hedging Section */}
      <section className="page-section px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">{t("whatIsHedging.businessTitle")}</h2>
          
          <p className="text-lg mb-8">
            {t("whatIsHedging.businessSubtitle")}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Building2 className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.importExport")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.importExportDesc")}</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <DollarSign className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.globalPayroll")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.globalPayrollDesc")}</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Shield className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.platforms")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.platformsDesc")}</p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-justify text-muted-foreground">
            {t("whatIsHedging.businessFooter")}
          </p>
        </div>
      </section>
      
      {/* Individual Hedging Section */}
      <section className="page-section px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">{t("whatIsHedging.individualsTitle")}</h2>
          
          <p className="text-lg mb-8">
            {t("whatIsHedging.individualsIntro")}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <GraduationCap className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.education")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.educationDesc")}</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Home className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.property")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.propertyDesc")}</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Luggage className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.travel")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.travelDesc")}</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <TrendingUp className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">{t("whatIsHedging.investments")}</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>{t("whatIsHedging.investmentsDesc")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Example Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">{t("whatIsHedging.exampleTitle")}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="border-destructive flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowDown className="mr-2 h-5 w-5 text-destructive" />
                  {t("whatIsHedging.withoutHedging")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <p className="mb-4 flex-grow">
                  {t("whatIsHedging.withoutHedgingDesc")}
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.tripBudget")}</span>
                    <span className="font-bold">$5,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.exchangeRateChange")}</span>
                    <span className="font-bold text-destructive">+16%</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.hedgeCost")}</span>
                    <span className="font-bold">R$0</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>{t("whatIsHedging.finalCost")}</span>
                    <span className="font-bold text-destructive">R$35,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  {t("whatIsHedging.withHedging")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <p className="mb-4 flex-grow">
                  {t("whatIsHedging.withHedgingDesc")}
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.tripBudget")}</span>
                    <span className="font-bold">$5,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.exchangeRateChange")}</span>
                    <span className="font-bold text-green-500">{t("whatIsHedging.locked")}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>{t("whatIsHedging.hedgeCost")}</span>
                    <span className="font-bold">R$900</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>{t("whatIsHedging.finalCost")}</span>
                    <span className="font-bold">R$30,900</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Interactive Simulator Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">{t("whatIsHedging.simulatorTitle")}</h2>
          <p className="text-lg text-center mb-8">
            {t("whatIsHedging.simulatorSubtitle")}
          </p>
          
          <CurrencySimulator showGraph={false} showTooltips={true} />
          
          <p className="text-base md:text-lg text-foreground/80 text-center mt-6">
            {t("whatIsHedging.simulatorHelper")}
          </p>
        </div>
      </section>
      
      {/* Bottom CTA Section */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              {t("landing.bottomCtaTitle")}
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("landing.bottomCtaBody")}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
              <Button
                size="lg"
                onClick={() => navigate("/developers")}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
              >
                {t("landing.viewApiQuickstart")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/")}
                className="px-8 py-4 text-lg"
              >
                {t("landing.learnMore")}
              </Button>
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

// Arrow right component for the animation
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14"></path>
      <path d="m12 5 7 7-7 7"></path>
    </svg>
  );
}
