import { useQuery } from "@tanstack/react-query";

const API_KEY = "demo"; // Replace with actual API key in production

export interface ExchangeRate {
  code: string;
  rate: number;
}

export function useCurrencyRates(base: string) {
  return useQuery({
    queryKey: ["currency-rates", base],
    queryFn: async () => {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${base}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch exchange rates");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "BRL", name: "Brazilian Real" },
];
