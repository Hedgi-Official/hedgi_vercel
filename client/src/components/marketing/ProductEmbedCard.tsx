import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, MoreHorizontal } from "lucide-react";

/**
 * ProductEmbedCard — a static illustration of Hedgi embedded inside a
 * fictional payments product ("Paga"). The Hedgi rate-protection
 * toggle is the card's single interactive affordance: flipping it
 * swaps concrete locked values for a range — demonstrating Hedgi's
 * core benefit (certainty vs. FX exposure) without leaving the card.
 */
export default function ProductEmbedCard() {
  const { t, i18n } = useTranslation();
  const isPt = i18n.language.startsWith("pt");
  const [protectionOn, setProtectionOn] = useState(true);

  const usdAmount = "$5,000.00";
  const balanceAmount = "$12,480.00";

  // Locked (ON) values — single certain numbers.
  const lockedRate = isPt ? "5,0846" : "5.0846";
  const brlAmount = isPt ? "R$ 25.423,00" : "R$ 25,423.00";

  // OFF state renders redacted "?????" in text-destructive to signal
  // FX exposure. Locale-invariant; the symbol is the whole value slot
  // (no currency prefix), so "you don't know what you'll get" reads
  // harder than a benign range would.
  const redacted = "?????";

  const subtitle = t("platforms.embed.protectionSubtitle");
  const hedgiIdx = subtitle.lastIndexOf("Hedgi");
  const subtitlePrefix = hedgiIdx >= 0 ? subtitle.slice(0, hedgiIdx) : subtitle;
  const subtitleSuffix =
    hedgiIdx >= 0 ? subtitle.slice(hedgiIdx + "Hedgi".length) : "";

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      {/* Host product chrome */}
      <div className="flex h-12 items-center justify-between rounded-t-2xl border-b border-border bg-stone-50 px-4">
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t("platforms.embed.brand")}
          </span>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {t("platforms.embed.screenLabel")}
        </span>
        <MoreHorizontal
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground"
        />
      </div>

      {/* Host-product balance line — subordinates the Hedgi module by
          establishing that "Paga" is the product; Hedgi is inside it. */}
      <div className="flex items-center justify-between border-b border-border px-6 pb-3 pt-5">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
          {t("platforms.embed.availableBalanceLabel")}
        </span>
        <span className="num-body text-sm font-medium text-foreground">
          {balanceAmount}
        </span>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* SEND */}
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {t("platforms.embed.sendLabel")}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="num-display text-2xl font-semibold text-foreground">
              {usdAmount}
            </span>
            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-foreground">
              {t("platforms.embed.sendAmountCurrency")}
            </span>
          </div>
        </div>

        {/* TO */}
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {t("platforms.embed.toLabel")}
          </div>
          <div className="mt-1 text-base font-medium text-foreground">
            {t("platforms.embed.toName")}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("platforms.embed.toMeta")}
          </div>
        </div>

        {/* ARRIVAL */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-navy">
            {t("platforms.embed.arrivalLabel")}
          </div>
          <div className="mt-1 text-base text-foreground">
            {t("platforms.embed.arrivalValue")}
          </div>
        </div>

        {/* Hedgi rate-protection module — toggle is interactive. */}
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          {/* Header + toggle — the entire header is the button so the
              whole row reads as tappable, not just the switch itself. */}
          <button
            type="button"
            role="switch"
            aria-checked={protectionOn}
            aria-label={t("platforms.embed.toggleAriaLabel")}
            onClick={() => setProtectionOn((v) => !v)}
            className="-m-1 flex w-full items-start justify-between gap-3 rounded-md p-1 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className="flex items-start gap-2">
              <Lock
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary"
              />
              <span className="block">
                <span className="block text-sm font-medium text-foreground">
                  {t("platforms.embed.protectionTitle")}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {subtitlePrefix}
                  {hedgiIdx >= 0 && (
                    <>
                      <span className="font-medium text-primary">Hedgi</span>
                      {subtitleSuffix}
                    </>
                  )}
                </span>
              </span>
            </span>
            {/* Toggle track + thumb. Track color and thumb position
                transition together for a smooth on/off swap. */}
            <span
              aria-hidden="true"
              className={`flex h-6 w-10 flex-shrink-0 items-center rounded-full px-0.5 transition-colors duration-200 ${
                protectionOn ? "bg-primary" : "bg-stone-300"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  protectionOn ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>

          {/* Data rows — ON shows single locked values (certainty,
              mint-wrapped); OFF shows range values (uncertainty,
              neutral wrapper). Keyed on protectionOn so React remounts
              the dl, letting animate-in fade the new state over. */}
          <dl
            key={protectionOn ? "on" : "off"}
            className={`mt-3 grid animate-in grid-cols-[1fr_auto] items-center gap-y-2 rounded-md p-3 text-sm fade-in duration-200 ${
              protectionOn ? "bg-primary/5" : "bg-stone-100/60"
            }`}
          >
            <dt className="text-muted-foreground">
              {t(
                protectionOn
                  ? "platforms.embed.row1Label"
                  : "platforms.embed.unlockedRateLabel",
              )}
            </dt>
            <dd
              className={`num-body justify-self-end ${
                protectionOn ? "text-foreground" : "text-destructive"
              }`}
            >
              {protectionOn ? lockedRate : redacted}
            </dd>

            <dt className="text-muted-foreground">
              {t("platforms.embed.row2Label")}
            </dt>
            <dd
              className={`num-body justify-self-end ${
                protectionOn ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {usdAmount}
            </dd>

            <dt
              className={
                protectionOn
                  ? "font-semibold text-primary"
                  : "text-muted-foreground"
              }
            >
              {t("platforms.embed.row3Label")}
            </dt>
            <dd
              className={`num-body justify-self-end ${
                protectionOn
                  ? "font-semibold text-primary"
                  : "text-destructive"
              }`}
            >
              {protectionOn ? brlAmount : redacted}
            </dd>
          </dl>
        </div>

        {/* Static CTA button — visual only, not interactive. Softer
            black than bg-foreground so the Hedgi mint stays the only
            saturated color in the card. */}
        <div
          aria-hidden="true"
          className="mt-6 rounded-lg bg-stone-900 py-3 text-center text-sm font-medium text-white"
        >
          {t("platforms.embed.cta")}
        </div>
      </div>
    </div>
  );
}
