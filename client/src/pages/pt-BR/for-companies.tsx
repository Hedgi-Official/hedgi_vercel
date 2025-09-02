import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Construction, Lock } from "lucide-react";
import { useState } from "react";

export default function ForCompanies() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "HedgiDev2025") {
      setIsAuthenticated(true);
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  const renderUnderConstruction = () => (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-6 w-6" />
              {t("Para Empresas")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              {t("Coming Soon")}
            </p>
            
            <div className="border-t pt-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  {t("Developer Access")}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder={t("Enter developer password")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" variant="outline">
                    {t("Access")}
                  </Button>
                </div>
                {showError && (
                  <p className="text-sm text-red-500">{t("Incorrect password")}</p>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );

  const renderMainPage = () => (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t("Para Empresas")}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Blank page content for now */}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );

  return (
    <>
      <Header showAuthButton={!user} username={user?.username} onLogout={handleLogout} />
      {isAuthenticated ? renderMainPage() : renderUnderConstruction()}
    </>
  );
}