import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function LanguageSelector({
  variant = "ghost",
}: {
  variant?: "ghost" | "outline";
}) {
  const currentPrefix = getLanguagePrefix();
  const isPortuguese = currentPrefix === "/pt";
  const currentLabel = isPortuguese ? "PT" : "EN";

  const switchToEnglish = () => {
    if (!isPortuguese) return;
    const path = getCurrentPathWithoutLang();
    window.location.href = path || "/";
  };

  const switchToPortuguese = () => {
    if (isPortuguese) return;
    const path = getCurrentPathWithoutLang();
    window.location.href = "/pt" + (path === "/" ? "" : path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          aria-label="Language"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span>{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        <DropdownMenuItem
          onClick={switchToEnglish}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-4",
            !isPortuguese && "text-foreground",
          )}
        >
          <span>English</span>
          {!isPortuguese ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={switchToPortuguese}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-4",
            isPortuguese && "text-foreground",
          )}
        >
          <span>Português</span>
          {isPortuguese ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
