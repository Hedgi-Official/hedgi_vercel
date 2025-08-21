
import * as React from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Shield, Globe, TrendingUp, Zap, Lock, Users } from "lucide-react";

export default function AboutUs() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5" />
        
        {/* Abstract Geometric Shapes */}
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-primary/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-tr from-green-500/5 to-primary/10 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
        
        {/* Currency Symbols */}
        <div className="absolute top-32 left-20 text-6xl font-bold text-primary/5 select-none">$</div>
        <div className="absolute top-64 right-32 text-5xl font-bold text-blue-500/5 select-none">€</div>
        <div className="absolute bottom-32 left-32 text-4xl font-bold text-green-500/5 select-none">¥</div>
        <div className="absolute bottom-48 right-20 text-5xl font-bold text-primary/5 select-none">£</div>
      </div>

      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8 md:py-20 relative z-10">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto text-center mb-20">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Globe className="h-16 w-16 text-primary animate-pulse" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary/20 rounded-full animate-ping" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 bg-gradient-to-r from-primary via-green-600 to-blue-600 bg-clip-text text-transparent">
            Hedgi — Protect What's Yours.
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground font-medium">
            Sleep easy. Hedge smarter.
          </p>
          
          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 mt-12 opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Bank-Grade Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Global Coverage</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Instant Execution</span>
            </div>
          </div>
        </div>

        {/* Mission Section with Cards */}
        <section className="max-w-6xl mx-auto mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-foreground">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                We don't believe anyone should lose sleep over currency fluctuations.
                At <strong className="text-primary">Hedgi</strong>, our mission is to give businesses peace of
                mind by making foreign exchange protection simple, transparent, and affordable.
              </p>
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <TrendingUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">Smart Protection</p>
                  <p className="text-sm text-muted-foreground">Algorithmic trading for optimal hedge execution</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <Card className="bg-gradient-to-br from-primary/5 to-blue-500/5 border-primary/20">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
                    <p className="text-muted-foreground mb-4">Uptime Guarantee</p>
                    <div className="w-full bg-background rounded-full h-2 mb-4">
                      <div className="bg-gradient-to-r from-primary to-green-500 h-2 rounded-full" style={{width: '99.9%'}} />
                    </div>
                    <p className="text-sm text-muted-foreground">Always available when you need protection</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto mb-20">
          <h2 className="text-4xl font-bold mb-12 text-center text-foreground">Why Choose Hedgi</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40 bg-gradient-to-b from-background to-primary/5">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Simple</h3>
                <p className="text-muted-foreground">No financial jargon. Just a clear way to manage currency risk with intuitive tools.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40 bg-gradient-to-b from-background to-blue-500/5">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-full">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Smart</h3>
                <p className="text-muted-foreground">Proprietary trading engine designed for efficiency and maximum savings.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40 bg-gradient-to-b from-background to-green-500/5">
              <CardContent className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-green-500/10 rounded-full">
                    <Shield className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Secure</h3>
                <p className="text-muted-foreground">Built on trusted payment rails with bank-grade security to keep your money safe.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Technology Section */}
        <section className="max-w-6xl mx-auto mb-20">
          <div className="bg-gradient-to-r from-primary/5 via-blue-500/5 to-green-500/5 rounded-2xl p-8 md:p-12 border border-primary/20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6 text-foreground">Advanced Technology</h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Hedgi provides businesses with a smarter way to hedge. Our proprietary
                  trading algorithm reduces fees and ensures transactional volume,
                  delivering the <strong className="text-primary">cheapest and quickest hedges possible</strong>.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-foreground">Real-time market analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-foreground">Automated risk management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-foreground">Cross-platform integration</span>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-xl blur-xl" />
                <Card className="relative bg-background/80 backdrop-blur-sm border-primary/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Lock className="h-6 w-6 text-primary" />
                      <span className="text-sm text-green-500 font-medium">ACTIVE</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Processing Speed</span>
                        <span className="text-sm font-semibold">< 500ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <span className="text-sm font-semibold">99.97%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cost Savings</span>
                        <span className="text-sm font-semibold text-primary">Up to 40%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Future Vision */}
        <section className="max-w-4xl mx-auto mb-20 text-center">
          <div className="flex justify-center mb-6">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-4xl font-bold mb-6 text-foreground">Looking Ahead</h2>
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">
            Currency risk is unavoidable, but losing money to it is not.
            With <strong className="text-primary">Hedgi</strong>, hedging becomes as natural as paying
            an invoice — seamless, fair, and stress-free.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-2xl font-bold text-primary mb-2">10K+</div>
              <p className="text-sm text-muted-foreground">Businesses Protected</p>
            </div>
            <div className="p-6 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-600 mb-2">$50M+</div>
              <p className="text-sm text-muted-foreground">Volume Hedged</p>
            </div>
            <div className="p-6 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="text-2xl font-bold text-green-600 mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Market Coverage</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-green-500/10 rounded-2xl p-8 md:p-12 border border-primary/20">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Ready to Start Hedging?</h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of businesses that trust Hedgi to protect their financial future.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-green-600 hover:from-primary/90 hover:to-green-600/90 text-white px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Start Hedging Now
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
