'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Props {
  data: Array<{
    year: number;
    principalPaid: number;
    interestPaid: number;
    balance: number;
    totalPaid: number;
  }>;
}

export default function AmortizationChart({ data }: Props) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">Year {data.year}</p>
          <p className="text-sm text-green-600">
            Principal: {formatCurrency(data.principalPaid)}
          </p>
          <p className="text-sm text-orange-600">
            Interest: {formatCurrency(data.interestPaid)}
          </p>
          <p className="text-sm text-blue-600 font-semibold mt-1">
            Remaining Balance: {formatCurrency(data.balance)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Amortization Schedule
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Annual breakdown of principal vs interest payments
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="year"
            label={{ value: 'Year', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Area
            type="monotone"
            dataKey="principalPaid"
            stackId="1"
            stroke="#10b981"
            fill="url(#colorPrincipal)"
            name="Principal Paid"
          />
          <Area
            type="monotone"
            dataKey="interestPaid"
            stackId="1"
            stroke="#f59e0b"
            fill="url(#colorInterest)"
            name="Interest Paid"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-green-50 rounded">
          <p className="text-xs text-gray-600 mb-1">Total Principal</p>
          <p className="font-semibold text-green-700">
            {formatCurrency(data.reduce((sum, d) => sum + d.principalPaid, 0))}
          </p>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <p className="text-xs text-gray-600 mb-1">Total Interest</p>
          <p className="font-semibold text-orange-700">
            {formatCurrency(data.reduce((sum, d) => sum + d.interestPaid, 0))}
          </p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <p className="text-xs text-gray-600 mb-1">Total Paid</p>
          <p className="font-semibold text-blue-700">
            {formatCurrency(data.reduce((sum, d) => sum + d.totalPaid, 0))}
          </p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded">
          <p className="text-xs text-gray-600 mb-1">Final Balance</p>
          <p className="font-semibold text-purple-700">
            {formatCurrency(data[data.length - 1]?.balance || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
