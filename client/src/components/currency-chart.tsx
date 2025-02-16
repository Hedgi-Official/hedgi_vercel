import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HistoricalRate {
  date: string;
  rate: number;
}

interface ChartData {
  historicalRates: HistoricalRate[];
  currentRate: number;
  tradeDirection: 'buy' | 'sell';
}

interface Props {
  data: ChartData;
}

export function CurrencyChart({ data }: Props) {
  // Convert rates to their inverse (e.g., from USD/BRL to BRL/USD)
  const processedData = data.historicalRates.map(point => ({
    date: point.date,
    rate: 1 / point.rate  // Convert to inverse rate for display
  }));

  // Calculate number of days from the data
  const days = processedData.length - 1;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-center">
        Last {days} Days Exchange Rate History
      </h3>
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
            <Line
              type="linear"
              dataKey="rate"
              stroke="#2563eb" // blue-600
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}