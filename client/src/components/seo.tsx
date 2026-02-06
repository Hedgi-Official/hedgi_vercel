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
    defaultTitle: "Hedgi - Currency Hedging API for Companies",
    defaultDescription: "Currency hedging API for fintechs and payment platforms. Protect clients from FX risk with one API call. Request sandbox access.",
    home: {
      title: "Currency Hedging API for Companies",
      description: "Currency hedging API for fintechs and payment platforms. Protect clients from FX risk with one API call. Request sandbox access."
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
    defaultTitle: "Hedgi - API de Hedge Cambial para Empresas",
    defaultDescription: "API de hedge cambial para fintechs e plataformas de pagamento. Proteja clientes do risco FX com uma chamada de API. Solicite acesso.",
    home: {
      title: "API de Hedge Cambial para Empresas",
      description: "API de hedge cambial para fintechs e plataformas de pagamento. Proteja clientes do risco FX com uma chamada de API. Solicite acesso."
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
type PageKey = "home" | "whatIsHedge" | "developers";

function getLanguageCode(lang: string): SupportedLanguage {
  if (lang.startsWith("pt")) return "pt-BR";
  return "en";
}

function getHreflangCode(lang: SupportedLanguage): string {
  return lang === "pt-BR" ? "pt-BR" : "en";
}

export function SEO({ titleKey, path, title, description }: SEOProps) {
  const { i18n } = useTranslation();
  const currentLang = getLanguageCode(i18n.language);
  const translations = seoTranslations[currentLang];
  
  useEffect(() => {
    document.documentElement.lang = getHreflangCode(currentLang);
  }, [currentLang]);

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

  const canonicalUrl = path ? `${BASE_URL}${path}` : BASE_URL;

  return (
    <Helmet>
      <html lang={getHreflangCode(currentLang)} />
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={currentLang === "pt-BR" ? "pt_BR" : "en_US"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:url" content={canonicalUrl} />
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
}
