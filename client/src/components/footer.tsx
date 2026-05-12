import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Mail, MapPin } from "lucide-react";

/*
 * Footer nav labels match the header's short form (Businesses /
 * Platforms / Developers) rather than the older "For X" phrasing.
 * "What is Hedging" stays as-is — it doesn't fit the same pattern.
 */
const NAV_ITEMS = [
  { href: "/", labelKey: "nav.businesses" },
  { href: "/platforms", labelKey: "nav.platforms" },
  { href: "/developers", labelKey: "nav.developers" },
  { href: "/what-is-hedge", labelKey: "nav.whatIsHedge" },
];

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/60 bg-surface-1">
      {/* Top padding preserved; bottom padding trimmed since the
          copyright no longer sits in its own full-width row below
          the grid. items-start aligns the logo, first link, and
          first contact row to a shared top baseline. */}
      <div className="container mx-auto px-4 pt-8 pb-6 md:pt-10 md:pb-8">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-3 md:gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <img
                src="/Hedgi.png?v=4"
                alt=""
                className="h-8 w-8 rounded-md"
              />
              <span className="font-display text-lg font-semibold tracking-tight text-foreground">
                Hedgi
              </span>
            </Link>
          </div>

          {/* Product links */}
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          {/* Contact + locality + copyright. Copyright absorbed into
              the right column as the final item so the footer
              doesn't need a dedicated full-width bottom row (and
              the 1px divider that separated it). Saves ~60px of
              vertical footer height. */}
          <div className="flex flex-col gap-2.5 text-sm">
            <a
              href="mailto:guilherme@hedgi.ai"
              className="inline-flex items-center gap-2 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {t("footer.emailLabel")}
            </a>
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {t("footer.madeIn")}
            </div>
            {/* Copyright rendered as two independent column items so
                the parent's gap-2.5 applies between them, matching
                the vertical rhythm of the email ↔ location gap
                above. Both inherit text-sm + text-muted-foreground. */}
            <span className="text-muted-foreground">
              {t("footer.copyrightLine1")}
            </span>
            <span className="text-muted-foreground">
              {t("footer.copyrightLine2")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
