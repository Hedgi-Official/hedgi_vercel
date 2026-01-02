import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import "@/i18n";
import { useTranslation } from "react-i18next";

import LandingPage from "@/pages/landing-page";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import WhatIsHedge from "@/pages/what-is-hedge";
import ForIndividuals from "@/pages/for-individuals";
import AboutUs from "@/pages/about-us";
import ForCompanies from "@/pages/for-companies";
import WhatIsHedgePTBR from "@/pages/pt-BR/what-is-hedge";
import ForIndividualsPTBR from "@/pages/pt-BR/for-individuals";
import AboutUsPTBR from "@/pages/pt-BR/about-us";
import ForCompaniesPTBR from "@/pages/pt-BR/for-companies";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import { UnderConstruction } from "@/components/under-construction";
import { Header } from "@/components/header";
import { CacheManager } from "@/components/cache-manager";

function Router() {
  const { user, isLoading } = useUser();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/dashboard">
        {user ? <Dashboard /> : <AuthPage />}
      </Route>
      <Route path="/profile">
        {user ? <Profile /> : <AuthPage />}
      </Route>
      <Route path="/what-is-hedge">
        {currentLanguage === "pt-BR" ? <WhatIsHedgePTBR /> : <WhatIsHedge />}
      </Route>
      <Route path="/for-individuals">
        {currentLanguage === "pt-BR" ? <ForIndividualsPTBR /> : <ForIndividuals />}
      </Route>
      <Route path="/for-companies">
        {currentLanguage === "pt-BR" ? <ForCompaniesPTBR /> : <ForCompanies />}
      </Route>
      <Route path="/about-us">
        {currentLanguage === "pt-BR" ? <AboutUsPTBR /> : <AboutUs />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <CacheManager />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;