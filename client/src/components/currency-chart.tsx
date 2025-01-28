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

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(value) => value.toFixed(4)} />
          <Tooltip formatter={(value) => value.toFixed(4)} />
          <ReferenceLine
            y={data.breakEvenRate}
            label="Break-even"
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