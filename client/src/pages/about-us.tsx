import * as React from "react";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />

      <main className="container mx-auto px-4 py-8 md:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-primary">
            Hedgi — Protect What’s Yours.
          </h1>
          <p className="text-lg md:text-xl mb-12 text-muted-foreground">
            Sleep easy. Hedge smarter.
          </p>
        </div>

        {/* Mission */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-primary">Our Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            We don’t believe anyone should lose sleep over currency fluctuations.
            At <strong>Hedgi</strong>, our mission is to give businesses peace of
            mind by making foreign exchange protection simple, transparent, and affordable.
          </p>
        </section>

        {/* What We Do */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-primary">What We Do</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Hedgi provides businesses with a smarter way to hedge. Our proprietary
            trading algorithm reduces fees and ensures transactional volume,
            delivering the <strong>cheapest and quickest hedges possible</strong>.
            That means you can focus on growth while we handle the volatility.
          </p>
        </section>

        {/* Why Hedgi */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-primary">Why Hedgi</h2>
          <ul className="list-disc list-inside text-lg text-gray-700 space-y-3">
            <li>
              <strong>Simple:</strong> No financial jargon. Just a clear way to manage currency risk.
            </li>
            <li>
              <strong>Smart:</strong> Proprietary trading engine designed for efficiency and savings.
            </li>
            <li>
              <strong>Secure:</strong> Built on trusted payment rails to keep your money safe.
            </li>
          </ul>
        </section>

        {/* Looking Ahead */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-semibold mb-4 text-primary">Looking Ahead</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Currency risk is unavoidable, but losing money to it is not.
            With <strong>Hedgi</strong>, hedging becomes as natural as paying
            an invoice — seamless, fair, and stress-free.
          </p>
        </section>

        {/* Call to Action */}
        <div className="text-center mt-20">
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
          >
            Start Hedging Now
          </Button>
        </div>
      </main>
    </div>
  );
}
