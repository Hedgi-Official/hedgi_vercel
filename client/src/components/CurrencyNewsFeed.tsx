// src/components/CurrencyNewsFeed.tsx
import React, { useState, useEffect } from "react";

type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: number; // as a JS timestamp
};

export const CurrencyNewsFeed: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      // Temporary array to accumulate all fetched stories
      const combined: Article[] = [];

      try {
        // ----------- SOURCE A: Yahoo Finance “search?q=currency” -----------
        const yahooRes = await fetch(
          "https://query1.finance.yahoo.com/v1/finance/search?q=currency"
        );
        if (yahooRes.ok) {
          const yahooJson: any = await yahooRes.json();
          const rawYahoo: any[] = yahooJson.news || [];
          rawYahoo.forEach((item) => {
            if (
              typeof item.title === "string" &&
              typeof item.link === "string"
            ) {
              combined.push({
                id: `yf-${item.uuid}`,
                title: item.title,
                url: item.link,
                source: item.publisher || "Yahoo Finance",
                publishedAt: (item.providerPublishTime || Date.now() / 1000) * 1000,
              });
            }
          });
        }
      } catch (e) {
        console.warn("YahooFinance fetch failed:", e);
      }

      // If we have combined stories, sort by newest first and dedupe by URL
      if (combined.length > 0) {
        // Deduplicate by URL
        const seen = new Set<string>();
        const deduped = combined
          .sort((a, b) => b.publishedAt - a.publishedAt)
          .filter((art) => {
            if (seen.has(art.url)) return false;
            seen.add(art.url);
            return true;
          })
          .slice(0, 5); // keep top 5 after dedupe & sort

        setArticles(deduped);
      } else {
        setArticles([]);
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  return (
    <section className="mt-12">
      <div className="container mx-auto px-4 lg:px-0">
        <h3 className="text-2xl font-semibold mb-6">Currency News This Week</h3>

        {loading && <div className="text-gray-500">Loading...</div>}
        {error && <div className="text-red-500">{error}</div>}

        {!loading && !error && articles.length === 0 && (
          <div className="text-gray-500">No recent currency news found.</div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-gray-200 rounded-lg hover:shadow-lg transition-shadow duration-150"
            >
              <div className="p-4">
                <h4 className="text-lg font-medium text-primary mb-1">{a.title}</h4>
                <div className="flex items-center text-sm text-gray-500">
                  <span>{a.source}</span>
                  <span className="mx-2">•</span>
                  <span>
                    {new Date(a.publishedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CurrencyNewsFeed;
