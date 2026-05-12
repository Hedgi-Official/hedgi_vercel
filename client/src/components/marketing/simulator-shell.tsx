import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SimulatorShellProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  eyebrowIcon?: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Inner max-width for the simulator card. Defaults to 4xl. */
  innerWidth?: "3xl" | "4xl" | "5xl";
  children: React.ReactNode;
}

const innerWidthClasses: Record<"3xl" | "4xl" | "5xl", string> = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
};

/**
 * Standardised framing around /business BusinessSimulator and
 * /what-is-hedge CurrencySimulator. The internals of each simulator
 * stay as they were; this shell unifies their marketing presentation
 * so the two pages read as the same product.
 *
 * The simulator's own full-width submit button is clipped by
 * [&_button[type=submit]]:max-w-xs so mint stripes don't read as
 * page banners.
 */
export function SimulatorShell({
  eyebrow,
  eyebrowIcon: Icon,
  title,
  subtitle,
  innerWidth = "4xl",
  className,
  children,
  ...rest
}: SimulatorShellProps) {
  return (
    <div className={cn("mx-auto", className)} {...rest}>
      <div className="mx-auto mb-8 max-w-2xl text-center">
        {eyebrow ? (
          <div className="mb-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            <span>{eyebrow}</span>
          </div>
        ) : null}
        <h2 className="font-display text-3xl md:text-[2.125rem] lg:text-4xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 text-base md:text-lg text-muted-foreground leading-relaxed">
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* The inner max-width is the limiter. Plain full-width Buttons
          get capped so they read as buttons, not stripes. The
          :not([data-state]) guard keeps Radix Select/Dialog triggers
          (which set data-state) at their natural full width. */}
      <div
        className={cn(
          "mx-auto",
          innerWidthClasses[innerWidth],
          "[&_button.w-full:not([data-state])]:mx-auto [&_button.w-full:not([data-state])]:max-w-sm",
        )}
      >
        {children}
      </div>
    </div>
  );
}
