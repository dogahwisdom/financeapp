import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays } from 'date-fns';
import { Database } from '../lib/database.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface TransactionChartProps {
  transactions: Transaction[];
}

export default function TransactionChart({ transactions }: TransactionChartProps) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    return format(date, 'MMM dd');
  }).reverse();

  const dailyTotals = last7Days.map(day => {
    return transactions
      .filter(t => format(new Date(t.created_at || ''), 'MMM dd') === day)
      .reduce((acc, t) => acc + (t.type === 'payment' ? t.amount : -t.amount), 0);
  });

  const data = {
    labels: last7Days,
    datasets: [
      {
        label: 'Net Transaction Amount',
        data: dailyTotals,
        fill: true,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `₵${context.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `₵${value}`,
        },
      },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="h-64">
      <Line data={data} options={options} />
    </div>
  );
}