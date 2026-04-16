import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

interface SEOProps {
  titleKey?: string;
  path?: string;
  title?: string;
  description?: string;
}

const BASE_URL = import.meta.env.VITE_BASE_URL || "https://hedgi.ai";

const seoTranslations = {
  en: {
    defaultTitle: "Hedgi - Currency Hedging for Brazilian Businesses",
    defaultDescription: "Currency hedging built for Brazilian importers, exporters, and teams paying in foreign currency.",
    home: {
      title: "Currency Hedging for Brazilian Businesses",
      description: "Currency hedging built for Brazilian importers, exporters, and teams paying in foreign currency."
    },
    platforms: {
      title: "Currency Hedging API for Platforms",
      description: "Embed currency hedging into your product. Offer your customers locked FX rates through a single API call."
    },
    whatIsHedge: {
      title: "What is Currency Hedging",
      description: "Learn how currency hedging protects international payments from exchange rate changes. Hedging strategies for businesses explained."
    },
    developers: {
      title: "Developer API Documentation",
      description: "Integrate Hedgi's currency hedging API into your app. RESTful endpoints, real-time quotes, and full documentation for developers."
    }
  },
  "pt-BR": {
    defaultTitle: "Hedgi - Proteção Cambial para Empresas Brasileiras",
    defaultDescription: "Proteção cambial para importadores, exportadores e empresas brasileiras que pagam em moeda estrangeira.",
    home: {
      title: "Proteção Cambial para Empresas Brasileiras",
      description: "Proteção cambial para importadores, exportadores e empresas brasileiras que pagam em moeda estrangeira."
    },
    platforms: {
      title: "API de Hedge Cambial para Plataformas",
      description: "Incorpore hedge cambial ao seu produto. Ofereça taxas travadas aos seus clientes com uma única chamada de API."
    },
    whatIsHedge: {
      title: "O que é Hedge Cambial",
      description: "Saiba como o hedge cambial protege pagamentos internacionais contra flutuações cambiais. Estratégias de hedge para empresas."
    },
    developers: {
      title: "Documentação da API para Desenvolvedores",
      description: "Integre a API de hedge cambial da Hedgi à sua aplicação. Endpoints RESTful, cotações em tempo real e documentação completa."
    }
  }
};

type SupportedLanguage = keyof typeof seoTranslations;
type PageKey = "home" | "platforms" | "whatIsHedge" | "developers";

function getLanguageCode(lang: string): SupportedLanguage {
  if (lang.startsWith("pt")) return "pt-BR";
  return "en";
}

function isPortuguesePath(): boolean {
  if (typeof window === "undefined") return false;
  const pathname = window.location.pathname;
  return pathname === "/pt" || pathname.startsWith("/pt/");
}

function getEnglishUrl(path: string): string {
  return path ? `${BASE_URL}${path}` : BASE_URL;
}

function getPortugueseUrl(path: string): string {
  const cleanPath = path && path !== "/" ? path : "";
  return `${BASE_URL}/pt${cleanPath}`;
}

export function SEO({ titleKey, path, title, description }: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = getLanguageCode(i18n.language);
  const translations = seoTranslations[currentLang];
  const isPt = isPortuguesePath();
  const htmlLang = isPt ? "pt-BR" : "en";

  useEffect(() => {
    document.documentElement.lang = htmlLang;
  }, [htmlLang]);

  let fullTitle: string;
  let metaDescription: string;

  if (titleKey && titleKey in translations) {
    const pageTranslations = translations[titleKey as PageKey];
    fullTitle = `${pageTranslations.title} | Hedgi`;
    metaDescription = pageTranslations.description;
  } else if (title) {
    fullTitle = `${title} | Hedgi`;
    metaDescription = description || translations.defaultDescription;
  } else {
    fullTitle = translations.defaultTitle;
    metaDescription = description || translations.defaultDescription;
  }

  const pagePath = path || "/";
  const canonicalUrl = isPt ? getPortugueseUrl(pagePath) : getEnglishUrl(pagePath);
  const enUrl = getEnglishUrl(pagePath);
  const ptUrl = getPortugueseUrl(pagePath);

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />

      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="pt-BR" href={ptUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={isPt ? "pt_BR" : "en_US"} />
      <meta property="og:locale:alternate" content={isPt ? "en_US" : "pt_BR"} />
      <meta property="og:image" content={`${BASE_URL}/Hedgi.png`} />
      <meta property="og:image:width" content="500" />
      <meta property="og:image:height" content="500" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Hedgi" />

      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:image" content={`${BASE_URL}/Hedgi.png`} />
    </Helmet>
  );
}
