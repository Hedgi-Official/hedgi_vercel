import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ContentCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Required: icon that appears in the mint tile at the top-left. */
  icon: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  /** Optional secondary paragraph — used by /platforms use-cases for
   *  the pain → outcome split. Rendered under the body with emphasis. */
  outcome?: React.ReactNode;
  /** Optional action area at the bottom of the card (usually a link). */
  action?: React.ReactNode;
  /** Mint-tinted featured variant — used once per grid for emphasis. */
  featured?: boolean;
  /** Applies interactive hover affordance. Only use when the card or
   *  an element inside it is a real click target. */
  interactive?: boolean;
}

export function ContentCard({
  icon: Icon,
  title,
  body,
  outcome,
  action,
  featured = false,
  interactive = false,
  className,
  ...rest
}: ContentCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card p-5 transition-[border-color,box-shadow] duration-150 ease-out",
        featured
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border",
        interactive &&
          "hover:border-primary/40 hover:shadow-sm",
        className,
      )}
      {...rest}
    >
      {/* Icon tile. Default variant uses the navy accent (non-CTA
          contexts: personas, use-cases, individuals grids). Featured
          variant keeps mint so the "come click me" card reads as an
          inline CTA against its sibling cards. */}
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
          featured ? "bg-primary/15" : "bg-accent-navy/10",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5",
            featured ? "text-primary" : "text-accent-navy",
          )}
        />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {body ? (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}
      {outcome ? (
        <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
          {outcome}
        </p>
      ) : null}
      {action ? <div className="mt-4 pt-1">{action}</div> : null}
    </div>
  );
}
