import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { Header } from "@/components/header";
import { Skyline } from "@/components/skyline";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} />

      <main className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left side - Hero content */}
          <div>
            <h1 className="text-7xl font-bold leading-tight mb-6">
              Protect the value
              <br />
              of your <TypingEffect />
            </h1>
            <Skyline />
            <p className="text-xl mb-8 text-muted-foreground max-w-xl">
              Professional currency hedging made simple
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Start Hedging Now
            </Button>
          </div>

          {/* Right side - Currency Simulator */}
          <div className="lg:mt-0">
            <CurrencySimulator showGraph={false} />
          </div>
        </div>
      </main>
    </div>
  );
}