import * as React from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

import { Globe, Shield, TrendingUp, Zap, Mail, Users, Building } from "lucide-react";

export default function AboutUs() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();


  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <Globe className="w-16 h-16 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">What is Hedgi?</h1>
              <p className="text-2xl md:text-3xl font-semibold mb-4 text-foreground">
                Currency Insurance for Everyone.
              </p>
              <p className="text-lg md:text-xl mb-8 text-muted-foreground">
                Protect your money against currency fluctuations when buying from other countries. Simple, automatic protection for businesses and individuals.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 px-4 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-primary mr-3" />
                <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                75% of companies not using currency protection lose money due to fluctuations. Currency moves erased $9.83 billion from corporate earnings in just one quarter.
                At <span className="font-semibold text-primary">Hedgi</span>, we provide simple currency insurance so you never lose money when buying from other countries - whether you're a business or an individual.
              </p>
              <div className="flex items-center justify-center text-primary font-medium">
                <TrendingUp className="w-5 h-5 mr-2" />
                <span>Secure your cash in just a few clicks</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary mb-2">75%</div>
                  <div className="text-sm text-muted-foreground">Companies Lose Money</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary mb-2">$9.8B</div>
                  <div className="text-sm text-muted-foreground">Lost to Currency Moves</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary mb-2">81%</div>
                  <div className="text-sm text-muted-foreground">Companies Use Protection</div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="text-center p-6">
                  <div className="text-3xl font-bold text-primary mb-2">52%</div>
                  <div className="text-sm text-muted-foreground">Now Considering It</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">Why Choose Hedgi</h2>
              <p className="text-lg text-muted-foreground">
                Simple currency insurance for anyone who buys from other countries
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Zap className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Radically Simple</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Just enter the amount and time period. No jargon, no complex terms. We handle everything else.</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Shield className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">Always Protected</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Your currency insurance is backed by trusted financial infrastructure. Secure automatic protection.</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-col items-center">
                  <Globe className="h-12 w-12 text-primary mb-2" />
                  <CardTitle className="text-center">For Everyone</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p>Whether you're buying products online, paying suppliers abroad, or making international purchases - we protect your money.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 px-4 bg-background">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4 text-foreground">How It Works</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Hedgi provides "currency insurance" - a simple way to protect against FX swings. 
                You only input the amount and time period, and Hedgi automatically executes the protection.
                No jargon, no barriers. <span className="font-semibold text-primary">Never see complex terms like swap rates or margin requirements</span>.
                Focus on what matters while we handle the currency risk.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Tell Us Your Need</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the amount and currency pair you want to protect
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Choose Duration</h3>
                <p className="text-sm text-muted-foreground">
                  Select how long you need protection (days, weeks, or months)
                </p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Stay Protected</h3>
                <p className="text-sm text-muted-foreground">
                  Hedgi locks your rate. You're protected from currency swings.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact & CTA Section */}
        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-6 text-foreground">Ready to Get Started?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stop losing money to currency fluctuations when buying from other countries.
                With <span className="font-semibold text-primary">Hedgi</span>, currency protection becomes as simple as
                getting insurance — automatic, affordable, and stress-free.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="text-lg"
                >
                  Get Currency Insurance
                </Button>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>or</span>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => window.location.href = 'mailto:hjalmar@hedgi.ai?subject=Inquiry about Hedgi Services'}
                  className="text-lg"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Contact Us
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>For business inquiries and enterprise solutions:</p>
                <a 
                  href="mailto:hjalmar@hedgi.ai" 
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  hjalmar@hedgi.ai
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}