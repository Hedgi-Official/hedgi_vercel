import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Phase = "holding" | "deleting" | "typing";

interface TypewriterProps {
  words: string[];
  className?: string;
  /** Color/weight of the cursor. Pass a Tailwind bg-* utility. */
  cursorClassName?: string;
  holdMs?: number;
  typeMs?: number;
  deleteMs?: number;
  pauseMs?: number;
}

/**
 * Typewriter — cycles through `words`, letter by letter.
 *
 * Layout: the outer span's min-width is locked to the widest candidate
 * word (measured on mount) so the surrounding text never reflows as the
 * visible text shrinks/grows. All candidates render inside an invisible
 * measurer alongside the visible letter-by-letter text.
 *
 * Motion: a small state machine drives phase transitions
 * (holding → deleting → pause → typing → holding) at the configured
 * timings. The cursor is visible only during typing and deleting
 * phases — hidden while the full word holds, to avoid a blinking
 * distraction on static text.
 *
 * Accessibility: respects `prefers-reduced-motion` by skipping the
 * animation entirely and rendering words[0] statically. The visible
 * span is `aria-live="off"` so the changing letters don't spam screen
 * readers; callers should pair this component with a sibling
 * `<span className="sr-only">...</span>` that expresses the broader
 * semantic claim.
 */
export function Typewriter({
  words,
  className,
  cursorClassName,
  holdMs = 2500,
  typeMs = 100,
  deleteMs = 50,
  pauseMs = 300,
}: TypewriterProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState(words[0] ?? "");
  const [phase, setPhase] = useState<Phase>("holding");
  const [minWidth, setMinWidth] = useState<number>(0);
  const measurerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Measure the widest candidate word on mount and whenever the list
  // or fonts change. The measurer span inherits the parent's font/size.
  useLayoutEffect(() => {
    if (!measurerRef.current) return;
    const children = measurerRef.current.querySelectorAll<HTMLSpanElement>(
      "[data-measure]",
    );
    let max = 0;
    children.forEach((child) => {
      const w = child.getBoundingClientRect().width;
      if (w > max) max = w;
    });
    setMinWidth(Math.ceil(max));
  }, [words]);

  // State machine — holding -> deleting -> pause -> typing -> holding.
  useEffect(() => {
    if (reducedMotion) return;
    let handle: ReturnType<typeof setTimeout>;

    if (phase === "holding") {
      handle = setTimeout(() => setPhase("deleting"), holdMs);
    } else if (phase === "deleting") {
      if (text.length === 0) {
        handle = setTimeout(() => {
          setWordIndex((i) => (i + 1) % words.length);
          setPhase("typing");
        }, pauseMs);
      } else {
        handle = setTimeout(() => setText(text.slice(0, -1)), deleteMs);
      }
    } else {
      // typing
      const target = words[wordIndex] ?? "";
      if (text === target) {
        handle = setTimeout(() => setPhase("holding"), 0);
      } else {
        handle = setTimeout(
          () => setText(target.slice(0, text.length + 1)),
          typeMs,
        );
      }
    }

    return () => clearTimeout(handle);
  }, [
    phase,
    text,
    wordIndex,
    words,
    holdMs,
    typeMs,
    deleteMs,
    pauseMs,
    reducedMotion,
  ]);

  // Snap back to static state when reduced-motion turns on.
  useEffect(() => {
    if (reducedMotion) {
      setText(words[0] ?? "");
      setWordIndex(0);
      setPhase("holding");
    }
  }, [reducedMotion, words]);

  const showCursor =
    !reducedMotion && (phase === "typing" || phase === "deleting");
  const displayText = reducedMotion ? words[0] ?? "" : text;

  return (
    <span
      className={cn("relative inline-block align-baseline", className)}
      style={minWidth > 0 ? { minWidth: `${minWidth}px` } : undefined}
      aria-live="off"
    >
      {/* Invisible measurer — stacks every candidate at parent font so
          we can read the widest pixel width and lock min-width. */}
      <span
        ref={measurerRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute inset-0 whitespace-nowrap"
      >
        {words.map((word) => (
          <span key={word} data-measure className="block">
            {word}
          </span>
        ))}
      </span>

      {/* Visible letters (or static word under prefers-reduced-motion) */}
      <span>{displayText}</span>

      {showCursor ? (
        <span
          aria-hidden="true"
          className={cn(
            "ml-[0.04em] inline-block w-[0.07em] align-baseline",
            cursorClassName ?? "bg-primary",
          )}
          style={{ height: "0.9em", verticalAlign: "-0.1em" }}
        />
      ) : null}
    </span>
  );
}
