const BASE_URL = "https://hedgi.ai";

// Server-side mirror of client/src/components/seo.tsx seoTranslations.
// Duplicated intentionally — the server cannot import client ESM modules.
const seoTranslations = {
  en: {
    defaultTitle: "Hedgi - Currency Hedging API for Companies",
    defaultDescription:
      "Currency hedging API for fintechs and payment platforms. Protect clients from FX risk with one API call. Request sandbox access.",
    home: {
      title: "Currency Hedging API for Companies",
      description:
        "Currency hedging API for fintechs and payment platforms. Protect clients from FX risk with one API call. Request sandbox access.",
    },
    whatIsHedge: {
      title: "What is Currency Hedging",
      description:
        "Learn how currency hedging protects international payments from exchange rate changes. Hedging strategies for businesses explained.",
    },
    developers: {
      title: "Developer API Documentation",
      description:
        "Integrate Hedgi's currency hedging API into your app. RESTful endpoints, real-time quotes, and full documentation for developers.",
    },
  },
  "pt-BR": {
    defaultTitle: "Hedgi - API de Hedge Cambial para Empresas",
    defaultDescription:
      "API de hedge cambial para fintechs e plataformas de pagamento. Proteja clientes do risco FX com uma chamada de API. Solicite acesso.",
    home: {
      title: "API de Hedge Cambial para Empresas",
      description:
        "API de hedge cambial para fintechs e plataformas de pagamento. Proteja clientes do risco FX com uma chamada de API. Solicite acesso.",
    },
    whatIsHedge: {
      title: "O que é Hedge Cambial",
      description:
        "Saiba como o hedge cambial protege pagamentos internacionais contra flutuações cambiais. Estratégias de hedge para empresas.",
    },
    developers: {
      title: "Documentação da API para Desenvolvedores",
      description:
        "Integre a API de hedge cambial da Hedgi à sua aplicação. Endpoints RESTful, cotações em tempo real e documentação completa.",
    },
  },
} as const;

type Lang = keyof typeof seoTranslations;
type PageKey = "home" | "whatIsHedge" | "developers";

// Maps clean path (without /pt prefix) to a page key
const routeMap: Record<string, PageKey> = {
  "/": "home",
  "/what-is-hedge": "whatIsHedge",
  "/developers": "developers",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Injects per-page SEO meta tags into the HTML template server-side.
 * This ensures crawlers (Google, Facebook, Twitter, LinkedIn) see correct
 * page-specific metadata without needing to execute JavaScript.
 */
export function injectSeoTags(html: string, requestPath: string): string {
  // Normalize: strip trailing slash (except root), strip query strings
  let cleanPath = requestPath.split("?")[0].split("#")[0];
  if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }

  // Determine language and strip /pt prefix for route lookup
  const isPt = cleanPath === "/pt" || cleanPath.startsWith("/pt/");
  const lang: Lang = isPt ? "pt-BR" : "en";
  const pathWithoutLang = isPt
    ? cleanPath.replace(/^\/pt/, "") || "/"
    : cleanPath;

  // Only inject for known public pages
  const pageKey = routeMap[pathWithoutLang];
  if (!pageKey) {
    return html;
  }

  const translations = seoTranslations[lang];
  const page = translations[pageKey];
  const fullTitle = `${page.title} | Hedgi`;
  const description = page.description;

  // Build URLs
  const enPath = pathWithoutLang === "/" ? "" : pathWithoutLang;
  const enUrl = `${BASE_URL}${enPath || "/"}`;
  const ptUrl = `${BASE_URL}/pt${enPath}`;
  const canonicalUrl = isPt ? ptUrl : enUrl;
  const ogLocale = isPt ? "pt_BR" : "en_US";
  const ogLocaleAlt = isPt ? "en_US" : "pt_BR";
  const htmlLang = isPt ? "pt-BR" : "en";

  // Escaped values for safe HTML injection
  const eTitle = escapeHtml(fullTitle);
  const eDesc = escapeHtml(description);

  // Build the meta tag block to inject
  const seoBlock = [
    `<!-- Server-injected SEO tags -->`,
    `<meta name="description" content="${eDesc}" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="pt-BR" href="${ptUrl}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
    `<meta property="og:title" content="${eTitle}" />`,
    `<meta property="og:description" content="${eDesc}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:locale" content="${ogLocale}" />`,
    `<meta property="og:locale:alternate" content="${ogLocaleAlt}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:title" content="${eTitle}" />`,
    `<meta name="twitter:description" content="${eDesc}" />`,
    `<meta name="twitter:url" content="${canonicalUrl}" />`,
  ].join("\n    ");

  // 1. Replace <html lang="en"> with correct language
  html = html.replace(`<html lang="en">`, `<html lang="${htmlLang}">`);

  // 2. Replace the static <title> with the page-specific one
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${eTitle}</title>`,
  );

  // 3. Inject the SEO meta block before the existing SEO comment
  html = html.replace(
    `<!-- SEO Meta Tags`,
    `${seoBlock}\n    <!-- SEO Meta Tags`,
  );

  return html;
}
