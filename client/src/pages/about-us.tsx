import * as React from "react";
import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";

import { 
  Shield, 
  Zap, 
  Mail, 
  Users, 
  ArrowRight,
  Target,
  BarChart3,
  Code
} from "lucide-react";

export default function AboutUs() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [selectedAudience, setSelectedAudience] = useState<'individuals' | 'companies'>('individuals');

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-foreground leading-tight">
                {t('aboutUs.headline')}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                {t('aboutUs.subheadline')}
              </p>

              {/* Audience Toggle */}
              <div className="inline-flex items-center bg-muted rounded-full p-1 mb-8">
                <button
                  onClick={() => setSelectedAudience('individuals')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedAudience === 'individuals'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('aboutUs.individuals')}
                </button>
                <button
                  onClick={() => setSelectedAudience('companies')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedAudience === 'companies'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('aboutUs.companies')}
                </button>
              </div>

              {/* Dynamic CTA Button */}
              <div className="flex justify-center">
                <Button size="lg" className="bg-primary hover:bg-primary/90 px-8 py-4 text-lg" asChild>
                  <Link href={selectedAudience === 'individuals' ? '/for-individuals' : '/for-companies'}>
                    {selectedAudience === 'individuals' 
                      ? t('aboutUs.getCurrencyInsurance') 
                      : t('aboutUs.viewApiQuickstart')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What We Do Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                {t('aboutUs.whatWeDoTitle')}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Card A - For Individuals */}
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{t('aboutUs.cardATitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{t('aboutUs.cardABody')}</p>
                  <Link href="/for-individuals" className="inline-flex items-center text-primary hover:text-primary/80 font-medium text-sm">
                    {t('aboutUs.cardALink')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              {/* Card B - For Companies */}
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Code className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{t('aboutUs.cardBTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{t('aboutUs.cardBBody')}</p>
                  <Link href="/for-companies" className="inline-flex items-center text-primary hover:text-primary/80 font-medium text-sm">
                    {t('aboutUs.cardBLink')} <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why Hedgi Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                {t('aboutUs.whyHedgiTitle')}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('aboutUs.whyCard1Title')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">{t('aboutUs.whyCard1Body')}</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('aboutUs.whyCard2Title')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">{t('aboutUs.whyCard2Body')}</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{t('aboutUs.whyCard3Title')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-sm">{t('aboutUs.whyCard3Body')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                {t('aboutUs.howItWorksTitle')}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('aboutUs.howItWorksBody')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-10">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('aboutUs.step1Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('aboutUs.step1Helper')}</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('aboutUs.step2Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('aboutUs.step2Helper')}</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">{t('aboutUs.step3Title')}</h3>
                <p className="text-sm text-muted-foreground">{t('aboutUs.step3Helper')}</p>
              </div>
            </div>

            {/* Links Row */}
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/what-is-hedging" className="text-primary hover:text-primary/80 flex items-center gap-1">
                {t('aboutUs.learnBasics')} <ArrowRight className="h-3 w-3" />
              </Link>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">{t('aboutUs.seeImplementations')}</span>
              <Link href="/for-individuals" className="text-primary hover:text-primary/80 flex items-center gap-1">
                {t('aboutUs.individuals')} <ArrowRight className="h-3 w-3" />
              </Link>
              <Link href="/for-companies" className="text-primary hover:text-primary/80 flex items-center gap-1">
                {t('aboutUs.forCompanies')} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* Who We Are + Contact Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              {/* Who We Are */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{t('aboutUs.whoWeAreTitle')}</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {t('aboutUs.whoWeAreBody')}
                </p>
              </div>

              {/* How To Reach Us */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{t('aboutUs.howToReachUsTitle')}</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  {t('aboutUs.howToReachUsBody')}
                </p>
                <div className="space-y-2">
                  <a 
                    href={`mailto:${t('aboutUs.emailMain')}`}
                    className="text-primary hover:text-primary/80 font-medium block"
                  >
                    {t('aboutUs.emailMain')}
                  </a>
                  <p className="text-sm text-muted-foreground">
                    {t('aboutUs.emailPartnerships')}{' '}
                    <a 
                      href={`mailto:${t('aboutUs.emailPartnershipsAddress')}`}
                      className="text-primary hover:text-primary/80"
                    >
                      {t('aboutUs.emailPartnershipsAddress')}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Section */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                {t('aboutUs.ctaHeadline')}
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {t('aboutUs.ctaBody')}
              </p>

              {/* Audience Toggle */}
              <div className="inline-flex items-center rounded-xl border border-border p-1.5 bg-muted/30 mb-8">
                <button
                  onClick={() => setSelectedAudience('individuals')}
                  className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                    selectedAudience === 'individuals'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {t('aboutUs.individuals')}
                </button>
                <button
                  onClick={() => setSelectedAudience('companies')}
                  className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                    selectedAudience === 'companies'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  {t('aboutUs.companies')}
                </button>
              </div>

              {/* Dynamic CTA Button */}
              <div className="flex justify-center items-center mb-6">
                {selectedAudience === 'individuals' ? (
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                    asChild
                  >
                    <Link href="/auth?type=individual">
                      {t('aboutUs.getCurrencyInsurance')}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                    asChild
                  >
                    <Link href="/for-companies">
                      {t('aboutUs.viewApiQuickstart')}
                    </Link>
                  </Button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {t('aboutUs.ctaSmallText')}
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  );
}
