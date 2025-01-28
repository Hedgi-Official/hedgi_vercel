const API_KEY = "YOUR_API_KEY"; // Would use env var in production

export async function fetchExchangeRate(base: string, target: string) {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${base}`
  );
  const data = await response.json();
  return data.rates[target];
}

export async function simulateHedge(
  base: string,
  target: string,
  amount: number,
  duration: number
) {
  const rate = await fetchExchangeRate(base, target);
  const hedgedAmount = amount * rate;

  // Calculate hedge costs
  const baseCost = 5; // Opening and closing cost
  const dailyCost = 10 * (duration / 7 * 5); // $10 per business day (5/7 of total days)
  const scalingFactor = amount / 10000; // Cost scales linearly with amount
  const totalCost = (baseCost + dailyCost) * scalingFactor;

  // Calculate break-even rate
  const breakEvenRate = rate + (totalCost / amount);

  return {
    rate,
    hedgedAmount,
    totalCost,
    breakEvenRate,
    costDetails: {
      baseCost: baseCost * scalingFactor,
      dailyCost: dailyCost * scalingFactor,
    }
  };
}