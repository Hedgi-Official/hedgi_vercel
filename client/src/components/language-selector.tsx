import { useTranslation } from 'react-i18next';
import ReactCountryFlag from "react-country-flag";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', country: 'US', label: 'English' },
    { code: 'pt-BR', country: 'BR', label: 'Português' },
    { code: 'es-MX', country: 'MX', label: 'Español' }
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {languages.map(({ code, country, label }) => (
          <Tooltip key={code}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`w-8 h-8 ${i18n.language === code ? 'bg-accent' : ''}`}
                onClick={() => i18n.changeLanguage(code)}
              >
                <ReactCountryFlag
                  countryCode={country}
                  svg
                  style={{
                    width: '1.5em',
                    height: '1.5em',
                  }}
                  title={label}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
