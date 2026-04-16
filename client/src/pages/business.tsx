import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencySimulator } from "@/components/currency-simulator";
import { useUser } from "@/hooks/use-user";

const AccessRequestForm = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    company: "",
    email: "",
    useCase: "",
    volumeBand: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sandbox-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, source: "business" }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setSubmitted(true);
    } catch (error) {
      console.error("[AccessRequestForm] Submit error:", error);
      alert(t("business.formErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          {t("business.formSuccessTitle")}
        </h3>
        <p className="text-muted-foreground">
          {t("business.formSuccessMessage")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="company">{t("business.formCompanyLabel")}</Label>
        <Input
          id="company"
          placeholder={t("business.formCompanyPlaceholder")}
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">{t("business.formEmailLabel")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("business.formEmailPlaceholder")}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="useCase">{t("business.formUseCaseLabel")}</Label>
        <Select
          value={formData.useCase}
          onValueChange={(value) => setFormData({ ...formData, useCase: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("business.formUseCasePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="imports">
              {t("business.formUseCaseImports")}
            </SelectItem>
            <SelectItem value="software">
              {t("business.formUseCaseSoftware")}
            </SelectItem>
            <SelectItem value="usd-revenue">
              {t("business.formUseCaseUsdRevenue")}
            </SelectItem>
            <SelectItem value="treasury">
              {t("business.formUseCaseTreasury")}
            </SelectItem>
            <SelectItem value="other">
              {t("business.formUseCaseOther")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="volume">{t("business.formVolumeLabel")}</Label>
        <Select
          value={formData.volumeBand}
          onValueChange={(value) =>
            setFormData({ ...formData, volumeBand: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t("business.formVolumePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under-10k">Under $10K</SelectItem>
            <SelectItem value="10k-50k">$10K - $50K</SelectItem>
            <SelectItem value="50k-250k">$50K - $250K</SelectItem>
            <SelectItem value="250k-1m">$250K - $1M</SelectItem>
            <SelectItem value="over-1m">Over $1M</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting
          ? t("business.formSubmitting")
          : t("business.formSubmit")}
      </Button>
    </form>
  );
};

const PreviewCard = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {t("business.previewLabel")}
        </span>
        <span className="text-xs font-mono text-primary">
          {t("business.previewSymbol")}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mb-6">
        {t("business.previewAction")}
      </div>
      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t("business.previewRateLabel")}
          </span>
          <span className="font-mono">{t("business.previewRate")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {t("business.previewMarkupLabel")}
          </span>
          <span className="font-mono">{t("business.previewMarkup")}</span>
        </div>
        <div className="flex justify-between text-base font-semibold pt-3 border-t">
          <span>{t("business.previewTotalLabel")}</span>
          <span className="font-mono text-primary">
            {t("business.previewTotal")}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 text-center">
        {t("business.previewFootnote")}
      </p>
    </div>
  );
};

export default function Business() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const openForm = () => setIsFormOpen(true);

  return (
    <div className="page-container bg-background">
      <SEO titleKey="home" path="/" />
      <Header
        showAuthButton={!user}
        username={user?.username}
        onLogout={handleLogout}
      />

      <main className="page-main">
        {/* Hero */}
        <section className="page-section-hero-subpage">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="space-y-6">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
                  {t("business.heroTitle")}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground">
                  {t("business.heroSubtitle")}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {t("business.requestAccess")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t("business.dialogTitle")}</DialogTitle>
                      </DialogHeader>
                      <AccessRequestForm />
                    </DialogContent>
                  </Dialog>
                  <Button size="lg" variant="outline" asChild>
                    <a href="#how" className="flex items-center gap-2">
                      {t("business.seeHow")}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
                <div className="inline-flex items-center text-sm font-medium text-foreground bg-primary/5 border border-primary/20 rounded-full px-4 py-2 w-fit">
                  <span>{t("business.heroPill")}</span>
                </div>
                <div>
                  <Link
                    href="/platforms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {t("business.notABusiness")}
                  </Link>
                </div>
              </div>

              <div className="lg:py-4">
                <PreviewCard />
              </div>
            </div>
          </div>
        </section>

        {/* Transparency */}
        <section className="py-12 md:py-20 border-t">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {t("business.transparencyTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("business.transparencyBody")}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 border-destructive/30 bg-destructive/5">
                <div className="flex items-center gap-2 text-destructive mb-3">
                  <EyeOff className="w-5 h-5" />
                  <span className="font-semibold text-sm">
                    {t("business.transparencyBankLabel")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("business.transparencyBankLine")}
                </p>
                <div className="space-y-2 font-mono text-sm text-muted-foreground/70">
                  <div className="flex justify-between">
                    <span>{t("business.transparencyHedgiLineRate")}</span>
                    <span>???</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("business.transparencyHedgiLineMarkup")}</span>
                    <span>???</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>{t("business.transparencyHedgiLineTotal")}</span>
                    <span>???</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 text-primary mb-3">
                  <Eye className="w-5 h-5" />
                  <span className="font-semibold text-sm">
                    {t("business.transparencyHedgiLabel")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("business.transparencyHedgiLine")}
                </p>
                <div className="space-y-2 font-mono text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("business.transparencyHedgiLineRate")}
                    </span>
                    <span>5.2345</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("business.transparencyHedgiLineMarkup")}
                    </span>
                    <span>0.0050</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-semibold">
                    <span>{t("business.transparencyHedgiLineTotal")}</span>
                    <span className="text-primary">5.2395</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {t("business.howItWorksTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("business.howItWorksSubtitle")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary">{n}</span>
                  </div>
                  <h3 className="font-semibold mb-1">
                    {t(`business.howStep${n}Title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`business.howStep${n}Desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Simulator */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-3">
                <Clock className="w-3.5 h-3.5" />
                <span>{t("business.simulatorBadge")}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {t("business.simulatorTitle")}
              </h2>
              <p className="text-muted-foreground">
                {t("business.simulatorHelper")}
              </p>
            </div>
            <CurrencySimulator showGraph={false} showTooltips={false} />
          </div>
        </section>

        {/* Personas */}
        <section className="py-12 md:py-20 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold">
                {t("business.personasTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="text-xs uppercase tracking-wider text-primary mb-2 font-semibold">
                  {t("business.personaCaioRole")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("business.personaCaioStory")}
                </p>
              </Card>
              <Card className="p-6">
                <div className="text-xs uppercase tracking-wider text-primary mb-2 font-semibold">
                  {t("business.personaMarinaRole")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("business.personaMarinaStory")}
                </p>
              </Card>
              <Card className="p-6">
                <div className="text-xs uppercase tracking-wider text-primary mb-2 font-semibold">
                  {t("business.personaRafaelRole")}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("business.personaRafaelStory")}
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {t("business.finalCtaTitle")}
            </h2>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={openForm}
              >
                {t("business.requestAccess")}
              </Button>
              <div className="inline-flex items-center text-sm font-medium text-foreground bg-primary/5 border border-primary/20 rounded-full px-4 py-2">
                <span>{t("business.heroPill")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t("business.finalCtaHelper")}
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
