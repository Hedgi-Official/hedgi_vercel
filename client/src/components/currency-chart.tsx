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
  // Don't invert the rates, use them as they come from XTB
  const processedData = data.historicalRates.map(point => ({
    date: point.date,
    rate: point.rate
  }));

  // Calculate number of days from the data
  const days = processedData.length - 1;

  // Calculate min and max values for Y axis domain
  const rates = processedData.map(d => d.rate);
  const minRate = Math.min(...rates, data.currentRate, data.breakEvenRate);
  const maxRate = Math.max(...rates, data.currentRate, data.breakEvenRate);
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
            />
            {/* Current rate reference line */}
            <ReferenceLine 
              y={data.currentRate} 
              stroke="#16a34a"
              strokeDasharray="3 3"
              label={{ 
                value: 'Current Rate',
                position: 'right',
                fill: '#16a34a'
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
                fill: '#dc2626'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}