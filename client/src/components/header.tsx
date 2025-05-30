import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/use-user";
import { Home } from "lucide-react";

interface HeaderProps {
  showAuthButton?: boolean;
  username?: string | null;
  onLogout?: () => void;
}

export function Header({ showAuthButton, username, onLogout }: HeaderProps) {
  const { t } = useTranslation();
  const { user } = useUser();

  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2">
            <img src="/Hedgi.png" alt="Hedgi Logo" className="h-12 w-auto rounded-lg" />
          </Link>
          <div className="hidden md:flex items-center space-x-4">
            <Link href={user ? "/dashboard" : "/"}>
              <Button variant="ghost">
                {t('Home')}
              </Button>
            </Link>
            <Link href="/what-is-hedge">
              <Button variant="ghost">{t('What is Hedging?')}</Button>
            </Link>
            <Link href="/using-hedgi">
              <Button variant="ghost">{t('Using Hedgi')}</Button>
            </Link>
            <Link href="/about-us">
              <Button variant="ghost">{t('About Us')}</Button>
            </Link>
            <Link href="/faq">
              <Button variant="ghost">{t('FAQ')}</Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          {username ? (
            <>
              <span className="text-foreground">{t('Welcome')}, {username}</span>
              <Button variant="outline" onClick={onLogout}>
                {t('Logout')}
              </Button>
            </>
          ) : showAuthButton && (
            <Button variant="outline" asChild>
              <Link href="/auth">{t('Get Started')}</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}