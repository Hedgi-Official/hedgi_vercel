import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "muted" | "negative" | "positive";

export type PricingComparisonRow = {
  label: React.ReactNode;
  body: React.ReactNode;
};

interface PricingComparisonCardProps {
  /**
   * Chrome selector:
   *  - `muted`    — flat bg-stone-50, no left-edge accent. Used by the
   *                 Businesses "AT A BANK" card where the neutral
   *                 treatment is the whole point.
   *  - `negative` — white bg, destructive-token left edge, subtle
   *                 shadow. Used by the /what-is-hedge "Without a
   *                 hedge" card.
   *  - `positive` — white bg, primary-token (mint) left edge, subtle
   *                 shadow. Used by the Businesses "AT HEDGI" card
   *                 and the /what-is-hedge "With a hedge" card.
   *
   * Header icon + eyebrow render in the shared navy label register
   * across all three variants; the variant only drives card chrome.
   */
  variant: Variant;
  icon: LucideIcon;
  eyebrow: React.ReactNode;
  /**
   * One short TL;DR sentence in the card's primary text color, sitting
   * between the eyebrow and the hairline divider above the rows.
   */
  summary: React.ReactNode;
  /**
   * Stacked sublabel + body rows divided by hairlines. Each row's
   * label renders in the small-caps sublabel register; body below.
   */
  rows: PricingComparisonRow[];
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  muted: "border border-border bg-stone-50",
  negative:
    "border border-border border-l-4 border-l-destructive bg-card shadow-sm",
  positive:
    "border border-border border-l-4 border-l-primary bg-card shadow-sm",
};

/**
 * Two-column comparison card pattern. Shared by the /business Simple
 * pricing section (muted + positive variants) and the /what-is-hedge
 * "real cost of an unprotected payment" section (negative + positive
 * variants). Extracted from inline /business markup so the two pages
 * stay in sync visually.
 *
 * At md+ the card opts into CSS subgrid so sibling cards share row
 * tracks — eyebrow aligns with eyebrow, summary with summary, and
 * each `{label, body}` row with its counterpart. The tallest body in
 * a given row drives the shared row height, and all following labels
 * stay level across cards. The parent grid must declare enough rows
 * (2 header + 2 × rows.length data) via `md:grid-rows-[...]` and
 * neutralize row gap via `md:gap-y-0` — row spacing comes from the
 * internal `md:pt-3` / `md:pb-3` on dt/dd. Mobile keeps the original
 * flex-column layout with divide-y between row wrappers.
 */
export function PricingComparisonCard({
  variant,
  icon: Icon,
  eyebrow,
  summary,
  rows,
  className,
}: PricingComparisonCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl p-6",
        "md:grid md:grid-rows-subgrid md:row-span-full md:gap-0",
        variantClasses[variant],
        className,
      )}
    >
      <div className="flex items-center gap-2 text-accent-navy">
        <Icon className="h-5 w-5" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {eyebrow}
        </span>
      </div>
      <p className="mt-3 mb-4 text-sm font-medium leading-relaxed text-foreground md:mb-0">
        {summary}
      </p>
      {/* dl + row wrapper both collapse to `display: contents` at md+
          so dt/dd become direct grid children of the card and occupy
          successive subgrid rows. Border between data rows moves from
          divide-y (wrapper-level) to md:border-t on dt (skipping the
          first row) — keeps the rule flush with its row boundary. */}
      <dl className="divide-y divide-stone-200 md:contents md:divide-y-0">
        {rows.map((row, i) => (
          <div key={i} className="py-3 md:contents md:py-0">
            <dt
              className={cn(
                "text-xs font-medium uppercase tracking-wide text-muted-foreground md:pt-3",
                i > 0 && "md:border-t md:border-stone-200",
              )}
            >
              {row.label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground md:pb-3">
              {row.body}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
