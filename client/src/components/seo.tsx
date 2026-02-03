import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
}

const BASE_URL = import.meta.env.VITE_BASE_URL || "https://hedgi.ai";
const defaultTitle = "Hedgi - Currency Hedging Platform";
const defaultDescription = "Hedgi is a professional currency hedging platform that helps individuals and businesses protect against exchange rate fluctuations. Lock in rates, reduce FX risk, and simplify international payments.";

export function SEO({ title, description, path }: SEOProps) {
  const fullTitle = title ? `${title} | Hedgi` : defaultTitle;
  const metaDescription = description || defaultDescription;
  const canonicalUrl = path ? `${BASE_URL}${path}` : BASE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:url" content={canonicalUrl} />
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  );
}
