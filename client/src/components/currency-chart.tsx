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
  const isProfitOnIncrease = data.tradeDirection === 'sell';
  const thresholdColor = isProfitOnIncrease ? "#22c55e" : "#ef4444"; // green-500 or red-500

  // Convert rates to their inverse (e.g., from USD/BRL to BRL/USD)
  const processedData = data.historicalRates.map(point => ({
    date: point.date,
    rate: 1 / point.rate  // Convert to inverse rate for display
  }));

  const breakEvenRate = 1 / data.breakEvenRate;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => value.toFixed(4)}
            tickCount={5}
          />
          <Tooltip 
            formatter={(value: number) => value.toFixed(4)} 
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <ReferenceLine
            y={breakEvenRate}
            label={{ 
              value: 'Break-even', 
              position: 'right',
              fill: thresholdColor
            }}
            stroke={thresholdColor}
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#2563eb" // blue-600
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}