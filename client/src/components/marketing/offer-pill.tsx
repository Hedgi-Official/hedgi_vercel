import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The $1,000-first-hedge offer pill. Shape is load-bearing — visible
 * on the /business hero, /business final CTA, and the /what-is-hedge
 * business path card. Preserved exactly as-is from the pre-revamp
 * codebase; do not restyle.
 */
export function OfferPill({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
