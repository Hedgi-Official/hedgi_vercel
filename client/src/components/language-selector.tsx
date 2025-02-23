import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { SiUsai, SiBrazil } from "react-icons/si";

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
      {i18n.language === 'en-US' ? (
        <SiUsai className="h-5 w-5" />
      ) : (
        <SiBrazil className="h-5 w-5" />
      )}
      <span className="text-xs">{i18n.language === 'en-US' ? 'EN' : 'PT'}</span>
    </Button>
  );
}