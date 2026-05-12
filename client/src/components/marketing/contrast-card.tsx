import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Variant = "negative" | "positive";

export type ContrastRow = {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Render the value in muted tone — used for bank-side "???" placeholders. */
  muted?: boolean;
  /** Row is the final total — gets the top divider and bold treatment. */
  total?: boolean;
};

interface BaseProps {
  variant: Variant;
  icon: LucideIcon;
  label: React.ReactNode;
  body?: React.ReactNode;
  className?: string;
}

interface RowsProps extends BaseProps {
  mode: "rows";
  rows: ContrastRow[];
}

interface MetricProps extends BaseProps {
  mode: "metric";
  value: React.ReactNode;
  caption?: React.ReactNode;
}

interface SimpleProps extends BaseProps {
  mode?: "simple";
  children?: React.ReactNode;
}

type ContrastCardProps = RowsProps | MetricProps | SimpleProps;

/**
 * Unified loss-vs-win pattern. Used on /business (transparency, rows
 * mode), /platforms (storyCase, metric mode), and /what-is-hedge
 * (Disney example, rows mode). `destructive` token carries loss;
 * `success` carries the Hedgi side.
 */
export function ContrastCard(props: ContrastCardProps) {
  const { variant, icon: Icon, label, body, className } = props;

  const toneBox =
    variant === "negative"
      ? "border-destructive/25 bg-destructive/5"
      : "border-success/25 bg-success/[0.06]";

  const toneText =
    variant === "negative" ? "text-destructive" : "text-success";

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border p-6",
        toneBox,
        className,
      )}
    >
      <div className={cn("flex items-center gap-2", toneText)}>
        <Icon className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
      </div>

      {body ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      ) : null}

      {props.mode === "rows" ? (
        /*
         * mt-auto pushes the rows block to the card bottom. Paired with
         * h-full on the card + align-items: stretch on the parent grid,
         * this guarantees row Y-positions match across the two cards
         * regardless of whether one body paragraph wraps to more lines
         * than the other.
         */
        <dl className="mt-auto space-y-2 pt-5 text-sm">
          {props.rows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "flex items-baseline justify-between",
                row.total && "border-t border-border/60 pt-2 font-semibold",
              )}
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd
                className={cn(
                  "num-body tabular-nums",
                  row.muted && "text-muted-foreground/70",
                  row.total && !row.muted && toneText,
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {props.mode === "metric" ? (
        <div className="mt-auto pt-5">
          <div
            className={cn(
              "num-display text-4xl md:text-[2.75rem] lg:text-5xl font-semibold leading-none",
              toneText,
            )}
          >
            {props.value}
          </div>
          {props.caption ? (
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              {props.caption}
            </div>
          ) : null}
        </div>
      ) : null}

      {props.mode === undefined || props.mode === "simple"
        ? (props as SimpleProps).children
        : null}
    </div>
  );
}
