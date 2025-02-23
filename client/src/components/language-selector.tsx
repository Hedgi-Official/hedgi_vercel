import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { US, BR } from 'country-flag-icons/react/3x2';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const setLanguage = (lang: 'en-US' | 'pt-BR') => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage('en-US')}
              className={`p-1 h-8 w-8 ${i18n.language === 'en-US' ? 'bg-accent' : ''}`}
            >
              <US className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Switch to English</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage('pt-BR')}
              className={`p-1 h-8 w-8 ${i18n.language === 'pt-BR' ? 'bg-accent' : ''}`}
            >
              <BR className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Mudar para Português</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}