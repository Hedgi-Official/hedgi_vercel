import { useTranslation } from "react-i18next";
import { ArrowDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RateVizThreeCol — three-column typographic composition that does the
 * core "without Hedgi, the rate could be anywhere; with Hedgi, it's
 * locked" argument using numbers only. Extracted from the original
 * /what-is-hedge hero so it can also appear as a compact visual
 * bridge above the /business simulator without duplicating copy.
 *
 * Labels + values come from whatIsHedging.hero.*, so both render sites
 * stay in lockstep with the same i18n source of truth.
 *
 * Two sizes:
 *  - "hero"    — the original /what-is-hedge top-of-page treatment.
 *                Number column sized text-5xl → lg:text-[4rem].
 *  - "compact" — ≈60% of the hero scale. Used as a lead-in element
 *                above a simulator, not as a section hero.
 */
type Size = "hero" | "compact";

interface RateVizThreeColProps {
  size?: Size;
  className?: string;
}

const numberSizeClasses: Record<Size, string> = {
  hero: "text-5xl md:text-5xl lg:text-[4rem]",
  compact: "text-3xl md:text-3xl lg:text-[2.5rem]",
};

const indicatorSpacingClasses: Record<Size, string> = {
  hero: "mt-5",
  compact: "mt-3",
};

const columnGapClasses: Record<Size, string> = {
  hero: "gap-y-12",
  compact: "gap-y-8",
};

export function RateVizThreeCol({
  size = "hero",
  className,
}: RateVizThreeColProps) {
  const { t } = useTranslation();
  const numberSize = numberSizeClasses[size];
  const indicatorMt = indicatorSpacingClasses[size];
  const columnGap = columnGapClasses[size];

  return (
    <div
      className={cn(
        "mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 md:gap-x-4 md:gap-y-0",
        columnGap,
        className,
      )}
    >
      {/* Column 1: TODAY — known rate, default color, no indicator. */}
      <div className="flex flex-col items-center px-4 text-center md:px-6">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
          {t("whatIsHedging.hero.todayLabel")}
        </div>
        <div
          className={cn(
            "mt-4 font-mono font-semibold leading-none tabular-nums text-foreground",
            numberSize,
          )}
        >
          {t("whatIsHedging.hero.todayValue")}
        </div>
      </div>

      {/* Column 2: IN 30 DAYS, UNHEDGED — muted range, down-arrow hint. */}
      <div className="flex flex-col items-center px-4 text-center md:px-6">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
          {t("whatIsHedging.hero.unhedgedLabel")}
        </div>
        <div
          className={cn(
            "mt-4 font-mono font-semibold leading-none tabular-nums text-muted-foreground/50",
            numberSize,
          )}
        >
          {t("whatIsHedging.hero.unhedgedValue")}
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
            indicatorMt,
          )}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          <span>{t("whatIsHedging.hero.unhedgedIndicator")}</span>
        </div>
      </div>

      {/* Column 3: IN 30 DAYS, HEDGED — same rate, mint Lock indicator
          (kept green because it carries the "positive outcome" accent). */}
      <div className="flex flex-col items-center px-4 text-center md:px-6">
        <div className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
          {t("whatIsHedging.hero.hedgedLabel")}
        </div>
        <div
          className={cn(
            "mt-4 font-mono font-semibold leading-none tabular-nums text-foreground",
            numberSize,
          )}
        >
          {t("whatIsHedging.hero.hedgedValue")}
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium text-primary",
            indicatorMt,
          )}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>{t("whatIsHedging.hero.hedgedIndicator")}</span>
        </div>
      </div>
    </div>
  );
}
