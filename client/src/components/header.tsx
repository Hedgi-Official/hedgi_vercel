import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  showAuthButton?: boolean;
  username?: string | null;
  onLogout?: () => void;
}

type NavItem = {
  href: string;
  labelKey: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.businesses" },
  { href: "/platforms", labelKey: "nav.platforms" },
  { href: "/developers", labelKey: "nav.developers" },
];

function isActive(location: string, href: string): boolean {
  // Wouter's useLocation returns paths relative to the router's base
  // prefix, so "/pt" becomes "/" here. No manual prefix handling needed.
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}

export function Header({ showAuthButton, username, onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen((s) => !s);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/60",
        "bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70",
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-12 items-center justify-between md:h-14">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-2"
            onClick={closeMobileMenu}
          >
            <img
              src="/Hedgi.png?v=4"
              alt=""
              className="h-7 w-7 rounded-md md:h-8 md:w-8"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-foreground md:text-[1.1rem]">
              Hedgi
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActive(location, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(item.labelKey)}
                  {active ? (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Desktop right */}
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSelector />
            {username ? (
              // Split affordance: clicking the username badge routes
              // straight to /dashboard (primary high-frequency action
              // for a logged-in visitor browsing marketing pages).
              // The small caret beside it opens a secondary menu for
              // Profile + Logout so those stay reachable without
              // forcing users into a two-click path to their
              // dashboard from every page.
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-r-none border-r-0"
                  asChild
                >
                  <Link href="/dashboard">
                    <User className="h-4 w-4" />
                    {username}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-none px-2"
                      aria-label="Account menu"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile"
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onLogout}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("Logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : showAuthButton ? (
              <Button size="sm" asChild>
                <Link href="/auth">{t("nav.requestAccess")}</Link>
              </Button>
            ) : null}
          </div>

          {/* Mobile right */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSelector />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>

        {/* Mobile drawer */}
        {isMobileMenuOpen ? (
          <div className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
            <div className="space-y-1 py-3">
              {NAV_ITEMS.map((item) => {
                const active = isActive(location, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out",
                      active
                        ? "bg-primary/5 text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    ) : (
                      <span className="h-1.5 w-1.5" />
                    )}
                    {t(item.labelKey)}
                  </Link>
                );
              })}

              <div className="mt-3 border-t border-border/60 pt-3">
                {username ? (
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 text-xs text-muted-foreground">
                      {t("Welcome")}, {username}
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout?.();
                        closeMobileMenu();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("Logout")}
                    </button>
                  </div>
                ) : showAuthButton ? (
                  <div className="px-3">
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/auth" onClick={closeMobileMenu}>
                        {t("nav.requestAccess")}
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
