import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { GrLanguage } from "react-icons/gr";

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en-US' ? 'pt-BR' : 'en-US';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative flex items-center gap-2"
      title={i18n.language === 'en-US' ? 'Mudar para Português' : 'Switch to English'}
    >
      <GrLanguage className="h-5 w-5" />
      <span className="text-xs">{i18n.language === 'en-US' ? 'EN' : 'PT'}</span>
    </Button>
  );
}