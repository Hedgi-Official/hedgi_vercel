import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  rate: number;
  worstCase: number;
  bestCase: number;
}

interface Props {
  data: ChartData;
}

export function CurrencyChart({ data }: Props) {
  const chartData = [
    { name: 'Start', value: data.rate },
    { name: 'Worst', value: data.worstCase },
    { name: 'Best', value: data.bestCase },
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2bedb7"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
