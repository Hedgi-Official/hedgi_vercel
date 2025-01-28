import { Button } from "@/components/ui/button";
import { TypingEffect } from "@/components/typing-effect";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

export default function LandingPage() {
  const [, navigate] = useLocation();
  const { user } = useUser();

  return (
    <div className="min-h-screen">
      <nav className="bg-secondary p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Hedgi</h1>
          {user ? (
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          )}
        </div>
      </nav>

      <main className="container mx-auto px-4">
        <section className="py-20">
          <div className="max-w-3xl">
            <h1 className="text-6xl font-bold leading-tight mb-6">
              Protect the value
              <br />
              of your <TypingEffect />
            </h1>
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
        </section>

        <section className="pb-20">
          <CurrencySimulator />
        </section>
      </main>
    </div>
  );
}