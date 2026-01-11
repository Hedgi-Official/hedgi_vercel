/* 
 * ARCHIVED LANDING PAGE SECTIONS
 * These sections were removed from the landing page and saved for potential future use.
 * Date archived: January 11, 2026
 */

// Required imports for these sections:
// import { CheckCircle, Zap, DollarSign } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { useTranslation } from "react-i18next";

/* ============================================
   FEATURE CARDS SECTION
   (instant protection, real-time monitoring, transparent pricing)
   ============================================ */

export const FeatureCardsSection = ({ t }: { t: (key: string) => string }) => (
  <section className="py-16 bg-muted/30">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            {/* <CheckCircle className="w-6 h-6 text-primary" /> */}
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.instantProtection")}</h3>
          <p className="text-muted-foreground">
            {t("landing.instantProtectionDesc")}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            {/* <Zap className="w-6 h-6 text-primary" /> */}
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.realTimeMonitoring")}</h3>
          <p className="text-muted-foreground">
            {t("landing.realTimeMonitoringDesc")}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-background border border-border hover:border-primary/20 transition-colors">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            {/* <DollarSign className="w-6 h-6 text-primary" /> */}
          </div>
          <h3 className="text-xl font-semibold mb-3 text-foreground">{t("landing.transparentPricing")}</h3>
          <p className="text-muted-foreground">
            {t("landing.transparentPricingDesc")}
          </p>
        </div>
      </div>
    </div>
  </section>
);

/* ============================================
   BOTTOM CTA SECTION
   ("Ready to protect your budget from currency swings?")
   ============================================ */

export const BottomCtaSection = ({ 
  t, 
  audienceType, 
  setAudienceType, 
  navigate 
}: { 
  t: (key: string) => string;
  audienceType: 'individuals' | 'companies';
  setAudienceType: (type: 'individuals' | 'companies') => void;
  navigate: (path: string) => void;
}) => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
          {t("landing.bottomCtaTitle")}
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t("landing.bottomCtaBody")}
        </p>

        {/* Audience Toggle */}
        <div className="inline-flex items-center rounded-xl border border-border p-1.5 bg-muted/30 mb-8">
          <button
            onClick={() => setAudienceType('individuals')}
            className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
              audienceType === 'individuals'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            {t("landing.individuals")}
          </button>
          <button
            onClick={() => setAudienceType('companies')}
            className={`px-6 py-3 rounded-lg text-base md:text-lg font-semibold transition-all ${
              audienceType === 'companies'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground/70 hover:text-foreground'
            }`}
          >
            {t("landing.companies")}
          </button>
        </div>

        {/* Dynamic CTA Button */}
        <div className="flex justify-center items-center mb-6">
          {audienceType === 'individuals' ? (
            <button
              onClick={() => navigate("/auth")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
            >
              {t("landing.getCurrencyInsurance")}
            </button>
          ) : (
            <button
              onClick={() => navigate("/for-companies")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-lg"
            >
              {t("landing.viewApiQuickstart")}
            </button>
          )}
        </div>

        {/* Helper Text */}
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          {t("landing.bottomCtaHelper")}
        </p>
      </div>
    </div>
  </section>
);

/* ============================================
   TRANSLATION KEYS USED (for reference):
   ============================================
   
   landing.instantProtection
   landing.instantProtectionDesc
   landing.realTimeMonitoring
   landing.realTimeMonitoringDesc
   landing.transparentPricing
   landing.transparentPricingDesc
   landing.bottomCtaTitle (e.g. "Ready to protect your budget from currency swings?")
   landing.bottomCtaBody
   landing.individuals
   landing.companies
   landing.getCurrencyInsurance
   landing.viewApiQuickstart
   landing.bottomCtaHelper
*/
