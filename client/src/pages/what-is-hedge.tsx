import { useState } from "react";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Building2, 
  Plane, 
  Wheat, 
  GraduationCap, 
  Home, 
  Luggage, 
  DollarSign, 
  Umbrella,
  TrendingUp,
  TrendingDown,
  ArrowDown,
  ArrowUp,
  Check
} from "lucide-react";
import { CurrencySimulator } from "@/components/currency-simulator";
import { Link, useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";

export default function WhatIsHedge() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const [audienceType, setAudienceType] = useState<'individuals' | 'companies'>('individuals');

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center">What is Hedging?</h1>
          
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
            Hedging is a risk-management technique that reduces uncertainty by offsetting an exposure with another position. In currency hedging, the goal is simple: make a future exchange rate more predictable, so your costs or revenues do not swing with the market.
          </p>
          <p className="text-base md:text-lg text-foreground/80 text-center mb-8">
            Think of it like "locking" an exchange rate for a defined amount and time window.
          </p>
        </div>
      </section>
      
      {/* Institutional Hedging Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How Do Businesses Use Currency Hedging?</h2>
          
          <p className="text-lg mb-8">
            Businesses hedge to keep pricing, margins, and cash flow predictable when they earn or pay in foreign currency.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Building2 className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Import / Export</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Lock rates for upcoming invoices so a shipment's cost or revenue does not change before payment.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <DollarSign className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Global Payroll & Contractors</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Hedge monthly USD/EUR payroll so operating expenses stay stable in local currency.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Shield className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Platforms</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Offer customers predictable rates while hedging the platform's own FX exposure in the background.</p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-justify text-muted-foreground">
            Businesses typically use tools like forwards, options, and swaps to manage currency risk, choosing the hedge size and duration based on their exposure.
          </p>
        </div>
      </section>
      
      {/* Individual Hedging Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">But What About Individuals?</h2>
          
          <p className="text-lg mb-8">
            Individuals face the same currency risk. If you have a future expense or goal in another currency, exchange rates can change the total cost.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <GraduationCap className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Education</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Tuition and living costs abroad can rise if your currency weakens.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Home className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Property</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>A foreign down payment can become more expensive before you close.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Luggage className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Travel</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Trips can cost more if the exchange rate moves against you.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <TrendingUp className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Investments</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Returns can change when you convert back to your home currency.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Example Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Example: Hedging a Family Trip to Disney World</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="border-destructive flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowDown className="mr-2 h-5 w-5 text-destructive" />
                  Without Hedging
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <p className="mb-4 flex-grow">
                  A Brazilian family plans a trip priced in USD. If the dollar strengthens before they pay, the trip costs more in BRL.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Trip Budget (USD):</span>
                    <span className="font-bold">$5,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Exchange Rate Change:</span>
                    <span className="font-bold text-destructive">+16%</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Hedge Cost:</span>
                    <span className="font-bold">R$0</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Final Cost (BRL):</span>
                    <span className="font-bold text-destructive">R$35,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-green-500 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Check className="mr-2 h-5 w-5 text-green-500" />
                  With Hedging
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
                <p className="mb-4 flex-grow">
                  The family locks an exchange rate for the trip budget. If the dollar strengthens, the locked rate helps keep the BRL cost predictable.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Trip Budget (USD):</span>
                    <span className="font-bold">$5,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Exchange Rate Change:</span>
                    <span className="font-bold text-green-500">Locked</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Hedge Cost:</span>
                    <span className="font-bold">R$900</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Final Cost (BRL):</span>
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
          <h2 className="text-3xl font-bold mb-8 text-center">Try It Yourself: Currency Hedge Simulator</h2>
          <p className="text-lg text-center mb-8">
            Choose a currency pair, amount, and expiration date to estimate the cost of locking a rate.
          </p>
          
          <CurrencySimulator showGraph={false} />
          
          <p className="text-base md:text-lg text-foreground/80 text-center mt-6">
            A hedge has a cost, just like insurance. The goal is predictability.
          </p>
        </div>
      </section>
      
      {/* Bottom CTA Section with Audience Toggle */}
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Ready to protect your budget from currency swings?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              In minutes, get currency insurance for your next payment—or route to the right setup for your business.
            </p>

            {/* Audience Toggle */}
            <div className="inline-flex items-center rounded-xl border border-border p-1.5 bg-muted/30 mb-8">
              <button
                onClick={() => setAudienceType('individuals')}
                className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                  audienceType === 'individuals'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                Individuals
              </button>
              <button
                onClick={() => setAudienceType('companies')}
                className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
                  audienceType === 'companies'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                Companies
              </button>
            </div>

            {/* Dynamic CTA Button */}
            <div className="flex justify-center items-center mb-6">
              {audienceType === 'individuals' ? (
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                >
                  Get Currency Insurance
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate("/for-companies")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
                >
                  View API Quickstart
                </Button>
              )}
            </div>

            {/* Helper Text */}
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Individuals and businesses use the same core idea: hedging works like insurance—pay a known cost to reduce uncertainty.
            </p>
          </div>
        </div>
      </section>
    </>
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
