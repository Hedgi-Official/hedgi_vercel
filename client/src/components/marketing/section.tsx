import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "muted" | "dark" | "navy";
type Density = "compact" | "default" | "roomy" | "hero";
type Width = "narrow" | "default" | "wide" | "full";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: Tone;
  density?: Density;
  width?: Width;
  divider?: boolean;
  /** When true, the container is omitted so children render full-bleed. */
  bleed?: boolean;
}

const toneClasses: Record<Tone, string> = {
  default: "bg-background text-foreground",
  muted: "bg-surface-1 text-foreground",
  dark: "bg-zinc-950 text-zinc-100",
  // Deep navy — used by the shared final-CTA panel pattern across
  // /business, /platforms, and /developers. Full-viewport-width
  // background; inner content stays constrained by the standard
  // container wrapper.
  navy: "bg-accent-navy text-white",
};

const densityClasses: Record<Density, string> = {
  compact: "py-10 md:py-14",
  default: "py-12 md:py-16 lg:py-20",
  roomy: "py-16 md:py-24 lg:py-28",
  // Hero matches current page-section-hero-subpage behaviour: ample
  // top/bottom, vertically centred on desktop when the section has
  // a min-height.
  hero: "py-12 md:py-16 lg:py-20",
};

const widthClasses: Record<Width, string> = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-none",
};

export function Section({
  tone = "default",
  density = "default",
  width = "default",
  divider = false,
  bleed = false,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(
        toneClasses[tone],
        densityClasses[density],
        divider && "border-t border-border",
        className,
      )}
      {...rest}
    >
      {bleed ? (
        children
      ) : (
        <div className={cn("container mx-auto px-4", widthClasses[width])}>
          {children}
        </div>
      )}
    </section>
  );
}

/* SectionHeader: a compact eyebrow + H2 + optional subtitle header block
   that sits at the top of most Sections. Keeps vertical rhythm inside
   sections consistent. */
interface SectionHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        align === "center" ? "text-center mx-auto max-w-2xl" : "text-left",
        "mb-10 md:mb-12",
        className,
      )}
    >
      {eyebrow ? (
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
          {eyebrow}
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
  );
}
