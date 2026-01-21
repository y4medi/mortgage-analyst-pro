'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { SensitivityDataPoint } from '@/types';

interface Props {
  data: SensitivityDataPoint[];
  baseRate: number;
}

export default function SensitivityChart({ data, baseRate }: Props) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2">
            Interest Rate: {data.interestRate}%
          </p>
          <p className="text-sm text-blue-600">
            Monthly Payment: {formatCurrency(data.monthlyPayment)}
          </p>
          <p className="text-sm text-purple-600">
            Total Interest: {formatCurrency(data.totalInterest)}
          </p>
          <p className="text-sm text-green-600">
            Total Cost: {formatCurrency(data.totalCost)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Interest Rate Sensitivity Analysis
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Current rate: <span className="font-semibold text-blue-600">{baseRate}%</span>
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="interestRate"
            label={{ value: 'Interest Rate (%)', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Monthly Payment ($)', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="monthlyPayment"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Monthly Payment"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-blue-50 rounded">
          <p className="text-gray-600">Lowest Rate</p>
          <p className="font-semibold text-blue-700">
            {data[0]?.interestRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ${data[0]?.monthlyPayment.toLocaleString()}/mo
          </p>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded">
          <p className="text-gray-600">Current Rate</p>
          <p className="font-semibold text-purple-700">{baseRate}%</p>
          <p className="text-xs text-gray-500 mt-1">
            ${data.find(d => d.interestRate === baseRate)?.monthlyPayment.toLocaleString()}/mo
          </p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <p className="text-gray-600">Highest Rate</p>
          <p className="font-semibold text-red-700">
            {data[data.length - 1]?.interestRate}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ${data[data.length - 1]?.monthlyPayment.toLocaleString()}/mo
          </p>
        </div>
      </div>
    </div>
  );
}
