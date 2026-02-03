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
    defaultTitle: "Hedgi - Currency Hedging Platform",
    defaultDescription: "Hedgi is a professional currency hedging platform that helps individuals and businesses protect against exchange rate fluctuations. Lock in rates, reduce FX risk, and simplify international payments.",
    home: {
      title: "Currency Hedging API for Companies",
      description: "Integrate currency hedging into your platform with Hedgi's simple API. Protect your clients from FX risk with one API call. Request sandbox access today."
    },
    whatIsHedge: {
      title: "What is Currency Hedging",
      description: "Learn how currency hedging protects your international payments from exchange rate fluctuations. Understand hedging strategies for businesses and individuals."
    },
    developers: {
      title: "Developer API Documentation",
      description: "Integrate Hedgi's currency hedging API into your application. RESTful endpoints, real-time quotes, and comprehensive documentation for developers."
    }
  },
  "pt-BR": {
    defaultTitle: "Hedgi - Plataforma de Hedge Cambial",
    defaultDescription: "Hedgi é uma plataforma profissional de hedge cambial que ajuda pessoas e empresas a se protegerem contra flutuações nas taxas de câmbio. Trave taxas, reduza riscos cambiais e simplifique pagamentos internacionais.",
    home: {
      title: "API de Hedge Cambial para Empresas",
      description: "Integre hedge cambial à sua plataforma com a API simples da Hedgi. Proteja seus clientes do risco cambial com uma única chamada de API. Solicite acesso ao sandbox hoje."
    },
    whatIsHedge: {
      title: "O que é Hedge Cambial",
      description: "Aprenda como o hedge cambial protege seus pagamentos internacionais contra flutuações nas taxas de câmbio. Entenda estratégias de hedge para empresas e pessoas físicas."
    },
    developers: {
      title: "Documentação da API para Desenvolvedores",
      description: "Integre a API de hedge cambial da Hedgi à sua aplicação. Endpoints RESTful, cotações em tempo real e documentação completa para desenvolvedores."
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
