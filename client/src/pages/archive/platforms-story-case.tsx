import { useTranslation } from "react-i18next";
import { Shield, TrendingDown } from "lucide-react";
import {
  ContrastCard,
  Section,
  SectionHeader,
} from "@/components/marketing";

/**
 * Archived 2026-04-20 — "The real cost of unprotected payments"
 * section formerly mounted on /platforms between the hero and the
 * use-cases grid. Removed per product call to declutter the
 * platforms narrative; preserved here so it can be re-imported and
 * mounted back on /platforms (directly below the hero section)
 * without re-authoring the JSX or the i18n fallbacks.
 *
 * i18n keys still live in `companiesPage.*` (storyCaseTitle,
 * storyCaseSubtitle, withoutHedging(Desc), lostToCurrency,
 * withHedgi(Desc), exposureEliminated, storyCaseCTA) — kept in
 * place for the same reason.
 *
 * To restore: `import { PlatformsStoryCase } from
 * "@/pages/archive/platforms-story-case";` and render it inside
 * /platforms' <main>.
 */
export function PlatformsStoryCase() {
  const { t } = useTranslation();
  return (
    <Section tone="muted" density="default" divider>
      <SectionHeader
        title={t("companiesPage.storyCaseTitle", {
          defaultValue: "The real cost of unprotected payments",
        })}
        subtitle={t("companiesPage.storyCaseSubtitle", {
          defaultValue:
            "A fintech in São Paulo processes a $50,000 payment to a US supplier",
        })}
      />
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        <ContrastCard
          variant="negative"
          icon={TrendingDown}
          label={t("companiesPage.withoutHedging", {
            defaultValue: "Without hedging",
          })}
          body={t("companiesPage.withoutHedgingDesc", {
            defaultValue:
              "The Real weakens 3% before settlement. Your client loses R$ 7,500 on a single transaction.",
          })}
          mode="metric"
          value="-R$ 7,500"
          caption={t("companiesPage.lostToCurrency", {
            defaultValue: "Lost to currency movement",
          })}
        />
        <ContrastCard
          variant="positive"
          icon={Shield}
          label={t("companiesPage.withHedgi", {
            defaultValue: "With Hedgi",
          })}
          body={t("companiesPage.withHedgiDesc", {
            defaultValue:
              "One API call locks the rate. Your client pays exactly what they budgeted with no surprises.",
          })}
          mode="metric"
          value="R$ 0"
          caption={t("companiesPage.exposureEliminated", {
            defaultValue: "Currency exposure eliminated",
          })}
        />
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-base text-muted-foreground md:text-lg">
        {t("companiesPage.storyCaseCTA", {
          defaultValue:
            "Protect every transaction with a simple API integration.",
        })}
      </p>
    </Section>
  );
}
