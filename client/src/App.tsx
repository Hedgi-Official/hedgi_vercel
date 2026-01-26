import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import "@/i18n";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import CorporateDashboard from "@/pages/corporate-dashboard";
import BatchUpload from "@/pages/batch-upload";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import WhatIsHedge from "@/pages/what-is-hedge";
import ForCompanies from "@/pages/for-companies";
import Developers from "@/pages/developers";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

import { CacheManager } from "@/components/cache-manager";

function Router() {
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
      <Route path="/" component={ForCompanies} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <CacheManager />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;