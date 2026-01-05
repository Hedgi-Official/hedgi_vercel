import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="py-6 border-t bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <img src="/Hedgi.png?v=4" alt="Hedgi Logo" className="h-8 w-auto rounded" />
          <span className="text-sm text-muted-foreground">{t('footer.copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
