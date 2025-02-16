import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HistoricalRate {
  date: string;
  rate: number;
}

interface ChartData {
  historicalRates: HistoricalRate[];
  breakEvenRate: number;
  currentRate: number;
  tradeDirection: 'buy' | 'sell';
}

interface Props {
  data: ChartData;
}

export function CurrencyChart({ data }: Props) {
  // Show loading state if no historical data is available
  if (!data.historicalRates?.length) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading historical data...</p>
      </div>
    );
  }

  console.log('[CurrencyChart] Rendering with data:', data);

  // Process and validate the data
  const processedData = data.historicalRates
    .filter(point => point.rate > 0) // Filter out invalid rates
    .map(point => ({
      date: new Date(point.date).toISOString(),
      rate: Number(point.rate.toFixed(4)) // Ensure consistent decimal places
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (processedData.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <p className="text-muted-foreground">No valid historical data available</p>
      </div>
    );
  }

  // Calculate number of days and domain boundaries
  const days = processedData.length - 1;
  const rates = [...processedData.map(d => d.rate), data.currentRate, data.breakEvenRate];
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const padding = (maxRate - minRate) * 0.1; // Add 10% padding

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-center">
        Last {days} Days Exchange Rate History
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
              minTickGap={50}
            />
            <YAxis 
              domain={[minRate - padding, maxRate + padding]}
              tickFormatter={(value) => value.toFixed(4)}
              tickCount={5}
            />
            <Tooltip 
              formatter={(value: number) => value.toFixed(4)} 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            {/* Historical rate line */}
            <Line
              type="monotone"
              dataKey="rate"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              isAnimationActive={true}
              animationDuration={500}
            />
            {/* Current rate reference line */}
            <ReferenceLine 
              y={data.currentRate} 
              stroke="#16a34a"
              strokeDasharray="3 3"
              label={{ 
                value: 'Current Rate',
                position: 'right',
                fill: '#16a34a',
                fontSize: 12
              }}
            />
            {/* Break-even rate reference line */}
            <ReferenceLine 
              y={data.breakEvenRate} 
              stroke="#dc2626"
              strokeDasharray="3 3"
              label={{ 
                value: 'Break-even Rate',
                position: 'left',
                fill: '#dc2626',
                fontSize: 12
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}