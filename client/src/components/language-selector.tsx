import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { US, BR } from 'country-flag-icons/react/3x2';

function getLanguagePrefix(): string {
  const pathname = window.location.pathname;
  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    return "/pt";
  }
  return "";
}

function getCurrentPathWithoutLang(): string {
  const pathname = window.location.pathname;
  if (pathname === "/pt") return "/";
  if (pathname.startsWith("/pt/")) return pathname.slice(3);
  return pathname;
}

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentPrefix = getLanguagePrefix();
  const isPortuguese = currentPrefix === "/pt";

  const switchToEnglish = () => {
    if (isPortuguese) {
      const path = getCurrentPathWithoutLang();
      window.location.href = path || "/";
    }
  };

  const switchToPortuguese = () => {
    if (!isPortuguese) {
      const path = getCurrentPathWithoutLang();
      window.location.href = "/pt" + (path === "/" ? "" : path);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={switchToEnglish}
              className={`p-1 h-8 w-8 ${!isPortuguese ? 'bg-accent' : ''}`}
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
              onClick={switchToPortuguese}
              className={`p-1 h-8 w-8 ${isPortuguese ? 'bg-accent' : ''}`}
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
