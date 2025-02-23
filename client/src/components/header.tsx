import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/language-selector";

interface HeaderProps {
  showAuthButton?: boolean;
  username?: string | null;
  onLogout?: () => void;
}

export function Header({ showAuthButton, username, onLogout }: HeaderProps) {
  return (
    <nav className="bg-background border-b">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/Hedgi.png" alt="Hedgi Logo" className="h-12 w-auto rounded-lg" />
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSelector />
          {username ? (
            <>
              <span className="text-foreground">Welcome, {username}</span>
              <Button variant="outline" onClick={onLogout}>
                Logout
              </Button>
            </>
          ) : showAuthButton && (
            <Button variant="outline" asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}