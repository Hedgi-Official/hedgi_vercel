const API_KEY = "YOUR_API_KEY"; // Would use env var in production

export async function fetchExchangeRate(base: string, target: string) {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${base}`
  );
  const data = await response.json();
  return data.rates[target];
}

function getBusinessDays(duration: number): number {
  // For a given number of calendar days, calculate business days
  // Assuming 5 business days per 7 calendar days
  return Math.round((duration * 5) / 7);
}

export async function simulateHedge(
  base: string,
  target: string,
  amount: number,
  duration: number
) {
  const rate = await fetchExchangeRate(base, target);
  const businessDays = getBusinessDays(duration);

  // Calculate costs
  const baseCost = 5; // Opening and closing cost
  const dailyCost = 10 * businessDays; // $10 per business day
  const scalingFactor = amount / 10000; // Cost scales linearly with amount
  const totalCost = (baseCost + dailyCost) * scalingFactor;

  // Calculate percentage cost relative to hedged amount
  const costPercentage = totalCost / amount;

  // Break-even rate is current rate plus the cost percentage
  const breakEvenRate = rate * (1 + costPercentage);

  return {
    rate,
    hedgedAmount: amount * rate,
    totalCost,
    breakEvenRate,
    costDetails: {
      baseCost: baseCost * scalingFactor,
      dailyCost: dailyCost * scalingFactor,
      costPercentage: costPercentage * 100, // Convert to percentage for display
    }
  };
}