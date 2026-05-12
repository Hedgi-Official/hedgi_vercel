import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface CodeShellProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Chrome variant. "window" renders traffic-light dots + a filename
   * label (used for static snippets). "terminal" renders a Terminal
   * icon + an interactive label (used for the live console).
   */
  variant?: "window" | "terminal";
  /** Filename / interactive label shown in the header. */
  label?: React.ReactNode;
  /** Icon shown to the left of the label in terminal variant. */
  icon?: LucideIcon;
  /** Optional action rendered on the right side of the header
   *  (e.g. a Copy cURL button). */
  action?: React.ReactNode;
}

export function CodeShell({
  variant = "window",
  label,
  icon: Icon,
  action,
  className,
  children,
  ...rest
}: CodeShellProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs md:text-sm text-zinc-300 shadow-lg",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {variant === "window" ? (
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
              {label ? (
                <span className="ml-2 truncate text-xs text-zinc-500">
                  {label}
                </span>
              ) : null}
            </>
          ) : (
            <>
              {Icon ? (
                <Icon className="h-4 w-4 flex-shrink-0 text-zinc-500" />
              ) : null}
              {label ? (
                <span className="truncate text-xs text-zinc-400">{label}</span>
              ) : null}
            </>
          )}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Thin wrapper around a <pre> to apply the chrome's body padding
 *  + line-height without forcing the parent to know CodeShell's
 *  internals. Use this for static syntax snippets. */
export function CodeShellBody({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLPreElement>) {
  return (
    <pre
      className={cn(
        "overflow-x-auto whitespace-pre px-4 py-4 leading-snug",
        className,
      )}
      {...rest}
    >
      {children}
    </pre>
  );
}
