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
  
  // Simulate potential savings/losses
  const volatility = 0.02; // 2% daily volatility
  const worstCase = hedgedAmount * (1 - volatility * duration);
  const bestCase = hedgedAmount * (1 + volatility * duration);

  return {
    rate,
    hedgedAmount,
    worstCase,
    bestCase,
  };
}
