import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import yfinance from 'yfinance';

interface ChartData {
  date: Date;
  close: number;
}

export default function CurrencyChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await yfinance.historical('BRL=X', {
        period: '1mo', // Fetch data for the last month
        interval: '1d', // Get daily data
      });
      const chartData = Object.entries(data).map(([date, values]) => ({
        date: new Date(date),
        close: values.close,
      }));
      setChartData(chartData);
    };

    fetchData();
  }, []);

  const options = {
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <Line data={{ datasets: [{ label: 'USD/BRL', data: chartData, }] }} options={options} />
    </div>
  );
}