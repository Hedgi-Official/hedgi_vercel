import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ChartData {
  rate: number;
  breakEvenRate: number;
  totalCost: number;
}

interface Props {
  data: ChartData;
}

export function CurrencyChart({ data }: Props) {
  const chartData = [
    { name: 'Current', value: data.rate },
    { name: 'Break-even', value: data.breakEvenRate },
  ];

  // Calculate min and max values as ±20% of current rate
  const minRate = data.rate * 0.8;
  const maxRate = data.rate * 1.2;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis 
            domain={[minRate, maxRate]} 
            tickFormatter={(value) => value.toFixed(4)}
            tickCount={5}
          />
          <Tooltip 
            formatter={(value: number) => value.toFixed(4)} 
            labelFormatter={(label) => `${label} Rate`}
          />
          <ReferenceLine
            y={data.breakEvenRate}
            label={{ value: 'Break-even', position: 'right' }}
            stroke="#2bedb7"
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2bedb7"
            strokeWidth={2}
            dot={{ fill: '#2bedb7' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}