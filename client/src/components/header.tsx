import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";
import { Menu, X, User, LogOut } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  showAuthButton?: boolean;
  username?: string | null;
  onLogout?: () => void;
}

export function Header({ showAuthButton, username, onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-background border-b relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <img src="/Hedgi.png?v=4" alt="Hedgi Logo" className="h-10 w-auto rounded-lg" />
          </Link>

          {/* Desktop Navigation - Left Aligned */}
          <div className="hidden md:flex items-center space-x-4 flex-1 ml-4">
            <Link href={user ? "/dashboard" : "/"}>
              <Button variant="ghost">
                {t('Home')}
              </Button>
            </Link>
            <Link href="/what-is-hedge">
              <Button variant="ghost">{t('What is Hedging?')}</Button>
            </Link>
            <Link href="/developers">
              <Button variant="ghost">{t('Developers')}</Button>
            </Link>
            <Link href="/about-us">
              <Button variant="ghost">{t('About Us')}</Button>
            </Link>
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSelector />
            {username ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="flex items-center gap-2 cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    {t('Logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : showAuthButton && (
              <Button variant="outline" asChild>
                <Link href="/auth">{t('Get Started')}</Link>
              </Button>
            )}
          </div>

          {/* Mobile Right Section */}
          <div className="md:hidden flex items-center gap-2">
            <LanguageSelector />
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="py-4 space-y-2">
              <Link href={user ? "/dashboard" : "/"}>
                <Button variant="ghost" className="w-full justify-start" onClick={closeMobileMenu}>
                  {t('Home')}
                </Button>
              </Link>
              <Link href="/what-is-hedge">
                <Button variant="ghost" className="w-full justify-start" onClick={closeMobileMenu}>
                  {t('What is Hedging?')}
                </Button>
              </Link>
              <Link href="/developers">
                <Button variant="ghost" className="w-full justify-start" onClick={closeMobileMenu}>
                  {t('Developers')}
                </Button>
              </Link>
              <Link href="/about-us">
                <Button variant="ghost" className="w-full justify-start" onClick={closeMobileMenu}>
                  {t('About Us')}
                </Button>
              </Link>
              
              {/* Mobile Auth Section */}
              <div className="pt-4 border-t">
                {username ? (
                  <>
                    <div className="px-4 py-2 text-sm text-foreground">
                      {t('Welcome')}, {username}
                    </div>
                    <Link href="/profile">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        onClick={closeMobileMenu}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start" 
                      onClick={() => {
                        onLogout?.();
                        closeMobileMenu();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t('Logout')}
                    </Button>
                  </>
                ) : showAuthButton && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/auth" onClick={closeMobileMenu}>
                      {t('Get Started')}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}