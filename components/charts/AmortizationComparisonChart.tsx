'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface Props {
  data: Array<{
    years: number;
    monthlyPayment: number;
    totalInterest: number;
    totalCost: number;
  }>;
}

export default function AmortizationComparisonChart({ data }: Props) {
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
          <p className="font-semibold text-gray-800 mb-2">{data.years} Year Term</p>
          <p className="text-sm text-blue-600">
            Monthly: {formatCurrency(data.monthlyPayment)}
          </p>
          <p className="text-sm text-orange-600">
            Total Interest: {formatCurrency(data.totalInterest)}
          </p>
          <p className="text-sm text-green-600 font-semibold mt-1">
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
        Amortization Period Comparison
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Compare different mortgage terms
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="years"
            label={{ value: 'Amortization Period (Years)', position: 'insideBottom', offset: -5 }}
            stroke="#6b7280"
          />
          <YAxis
            label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
            stroke="#6b7280"
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="monthlyPayment" fill="#3b82f6" name="Monthly Payment" />
          <Bar dataKey="totalInterest" fill="#f59e0b" name="Total Interest" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 Tip:</span> Shorter amortization periods have higher
          monthly payments but save significantly on total interest paid.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map((item) => (
          <div key={item.years} className="text-center p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-xs text-gray-600 mb-1">{item.years} Years</p>
            <p className="font-semibold text-gray-800 text-sm">
              {formatCurrency(item.monthlyPayment)}/mo
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Interest: {formatCurrency(item.totalInterest)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
