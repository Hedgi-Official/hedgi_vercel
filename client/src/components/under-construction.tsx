import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";
import { useTranslation } from "react-i18next";

interface UnderConstructionProps {
  title: string;
}

export function UnderConstruction({ title }: UnderConstructionProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Construction className="h-6 w-6" />
              {t(title)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('Coming Soon')}
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
