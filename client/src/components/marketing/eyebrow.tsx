import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone = "primary" | "muted" | "success" | "destructive" | "mint";

interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  tone?: Tone;
}

/**
 * Default (`primary`) tone renders in deep navy (`--accent-navy`) — the
 * second brand accent, which carries the "data-forward" label register
 * across the site. The explicit `mint` tone is available for the rare
 * case where mint is semantically correct (live indicator, positive
 * outcome accent). Everything else that wants the label/eyebrow look
 * should use the default.
 */
const toneClasses: Record<Tone, string> = {
  primary: "text-accent-navy",
  muted: "text-muted-foreground",
  success: "text-success",
  destructive: "text-destructive",
  mint: "text-primary",
};

export function Eyebrow({
  icon: Icon,
  tone = "primary",
  className,
  children,
  ...rest
}: EyebrowProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{children}</span>
    </div>
  );
}
