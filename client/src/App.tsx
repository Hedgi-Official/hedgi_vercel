import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import i18n from "@/i18n";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import CorporateDashboard from "@/pages/corporate-dashboard";
import BatchUpload from "@/pages/batch-upload";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import WhatIsHedge from "@/pages/what-is-hedge";
import Business from "@/pages/business";
import Platforms from "@/pages/platforms";
import Developers from "@/pages/developers";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import { CacheManager } from "@/components/cache-manager";

function getLanguageFromPath(): { lang: "en" | "pt"; base: string } {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    return { lang: "pt", base: "/pt" };
  }
  return { lang: "en", base: "" };
}

function LanguageSync({ lang }: { lang: "en" | "pt" }) {
  useEffect(() => {
    const target = lang === "pt" ? "pt-BR" : "en-US";
    if (!i18n.language?.startsWith(lang)) {
      i18n.changeLanguage(target);
    }
  }, [lang]);
  return null;
}

function AppRouter() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Business} />
      <Route path="/platforms" component={Platforms} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      <Route path="/dashboard">
        {user ? (user.userType === 'business' ? <CorporateDashboard /> : <Dashboard />) : <AuthPage />}
      </Route>
      <Route path="/corporate-dashboard">
        {user && user.userType === 'business' ? <CorporateDashboard /> : <AuthPage />}
      </Route>
      <Route path="/batch-upload">
        {user && user.userType === 'business' ? <BatchUpload /> : <AuthPage />}
      </Route>
      <Route path="/profile">
        {user ? <Profile /> : <AuthPage />}
      </Route>
      <Route path="/what-is-hedge" component={WhatIsHedge} />
      <Route path="/developers" component={Developers} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { lang, base } = getLanguageFromPath();

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={base}>
        <LanguageSync lang={lang} />
        <AppRouter />
        <CacheManager />
        <Toaster />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
