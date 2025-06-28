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
            <div className="relative flex items-center space-x-4 p-4 rounded-lg bg-card shadow-md">
              <div className="text-3xl font-bold text-primary flex items-center">
                <span>USD</span>
                <div className="mx-4 flex flex-col">
                  <TrendingUp className="h-6 w-6 text-primary animate-pulse" />
                  <TrendingDown className="h-6 w-6 text-destructive animate-pulse" />
                </div>
                <span>BRL</span>
              </div>
              <ArrowRight className="h-8 w-8" />
              <div className="flex items-center space-x-2">
                <Shield className="h-10 w-10 text-primary" />
                <div className="text-3xl font-bold">
                  <span>USD</span>
                  <span className="mx-2">=</span>
                  <span>BRL</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-lg md:text-xl text-justify mb-8">
            Hedging is a financial strategy designed to minimize risk by protecting against fluctuations in prices, 
            interest rates, currencies, or other market uncertainties. Simply put, hedging acts like insurance, 
            shielding investors, companies, and individuals from unexpected financial losses caused by volatile 
            market movements.
          </p>
        </div>
      </section>
      
      {/* Institutional Hedging Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">How Do Institutions Use Hedging?</h2>
          
          <p className="text-lg mb-8">
            Businesses and financial institutions regularly use hedging to protect their operations and profits.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Plane className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Airlines</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Hedge fuel costs to safeguard against rising oil prices.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Wheat className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Agricultural</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Hedge crop prices to ensure predictable revenues.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Building2 className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Corporations</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Hedge currency risks to manage international operations.</p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-justify text-muted-foreground">
            This sophisticated approach has traditionally been reserved for large corporations and financial institutions, 
            which have access to specialized financial products and teams of financial experts.
          </p>
        </div>
      </section>
      
      {/* Individual Hedging Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">But What About Individuals?</h2>
          
          <p className="text-lg mb-8">
            Individuals face similar risks—especially when it comes to currency fluctuations. Consider scenarios such as:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <GraduationCap className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Education</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Overseas education costs that fluctuate due to exchange rates.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Home className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Property</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Property purchases abroad becoming unexpectedly expensive.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <Luggage className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Travel</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Travel expenses increasing sharply because of sudden currency changes.</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-col items-center">
                <DollarSign className="h-12 w-12 text-primary mb-2" />
                <CardTitle className="text-center">Investments</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>Investments and savings losing value simply due to currency volatility.</p>
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
                  A Brazilian family plans a trip to Disney World, costing R$30,000 at today's exchange rate. 
                  If the US dollar appreciates, the same trip might later cost R$35,000 or more.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Initial Cost:</span>
                    <span className="font-bold">R$30,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Exchange Rate Changes:</span>
                    <span className="font-bold text-destructive">+ R$5,000</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Final Cost:</span>
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
                  The family locks in today's exchange rate, guaranteeing their trip will cost exactly 
                  R$30,000 regardless of future currency movements.
                </p>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span>Initial Cost:</span>
                    <span className="font-bold">R$30,000</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Exchange Rate Changes:</span>
                    <span className="font-bold text-green-500">R$0</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Final Cost:</span>
                    <span className="font-bold">R$30,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-lg text-justify mb-8 text-muted-foreground">
            Unfortunately, most financial institutions do not offer hedging solutions tailored to 
            the unique needs and scale of individual customers.
          </p>
        </div>
      </section>
      
      {/* Interactive Simulator Section */}
      <section className="py-16 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Try It Yourself: Currency Hedge Simulator</h2>
          <p className="text-lg text-center mb-8">
            See how currency hedging can protect your future expenses from exchange rate volatility.
          </p>
          
          <CurrencySimulator showGraph={false} />
        </div>
      </section>
      
      {/* Hedgi Introduction Section */}
      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center mb-6">
            <Umbrella className="h-16 w-16 text-primary" />
          </div>
          
          <h2 className="text-3xl font-bold mb-6 text-center">
            Introducing Hedgi: Hedging Solutions Designed for You
          </h2>
          
          <p className="text-lg text-justify mb-8">
            At Hedgi, we believe everyone deserves access to financial peace of mind. That's why we've built 
            hedging solutions specifically tailored to individuals, making it easy, transparent, and affordable 
            to protect your money against currency risks.
          </p>
          
          <div className="space-y-4 max-w-2xl mx-auto mb-10">
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Secure today's favorable exchange rates for future expenses.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Protect your finances from unexpected market movements.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-primary rounded-full p-1 mt-1">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
              <p>Enjoy the same sophisticated risk management tools that large corporations use—but designed specifically for your individual needs.</p>
            </div>
          </div>
          
          <p className="text-lg text-justify mb-8">
            Take control of your financial future and protect yourself from currency volatility. 
            Hedging isn't just for large institutions anymore—it's for you.
          </p>
          
          <div className="flex justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="text-lg">
                Discover How Easy Hedging Can Be with Hedgi
              </Button>
            </Link>
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
