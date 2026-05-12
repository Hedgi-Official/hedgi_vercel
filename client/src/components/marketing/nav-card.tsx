import * as React from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NavCard codifies the 3-path disambiguation shape from
 * /what-is-hedge. Used when a whole card is a click target:
 * mint uppercase eyebrow, body, optional $1,000 pill slot,
 * CTA label + arrow.
 */
interface NavCardProps {
  eyebrow: React.ReactNode;
  body: React.ReactNode;
  cta: React.ReactNode;
  href: string;
  /** Optional ReactNode rendered above the CTA — used to embed the
   *  $1,000 offer pill on the business path card. */
  pill?: React.ReactNode;
  className?: string;
}

export function NavCard({
  eyebrow,
  body,
  cta,
  href,
  pill,
  className,
}: NavCardProps) {
  return (
    <Link href={href} className="group block h-full">
      <div
        className={cn(
          "flex h-full cursor-pointer flex-col rounded-lg border border-border bg-card p-6 transition-[border-color,box-shadow] duration-150 ease-out",
          "hover:border-primary/40 hover:shadow-sm",
          className,
        )}
      >
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </div>
        <p className="flex-grow text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {pill ? <div className="mt-4">{pill}</div> : null}
        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5">
          {cta}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
