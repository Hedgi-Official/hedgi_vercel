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

      <main>
        <section className="bg-accent text-white py-20">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">
              Protect the value of your <TypingEffect />
            </h1>
            <p className="text-xl mb-8">
              Professional currency hedging made simple
            </p>
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Hedging Now
            </Button>
          </div>
        </section>

        <section className="py-16 bg-background">
          <div className="container mx-auto">
            <CurrencySimulator />
          </div>
        </section>
      </main>
    </div>
  );
}
