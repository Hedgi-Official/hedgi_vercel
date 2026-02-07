import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Helmet>
        <title>404 - Page Not Found | Hedgi</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('404 Title', { defaultValue: 'Page Not Found' })}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('404 Description', { defaultValue: "The page you're looking for doesn't exist or has been moved." })}
          </p>
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t('Home')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
