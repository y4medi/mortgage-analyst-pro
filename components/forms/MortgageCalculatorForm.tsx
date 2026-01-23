'use client';

import { useEffect, useState } from 'react';
import type { PaymentFrequency } from '@/types';

export interface MortgageFormData {
  principal: number;
  interestRate: number;
  amortizationYears: number;
  frequency: PaymentFrequency;
  grossAnnualIncome: number;
  monthlyDebts: number;
}

interface Props {
  onCalculate: (data: MortgageFormData) => void;
  prefillData?: Partial<MortgageFormData>;
}

const DEFAULT_FORM_DATA: MortgageFormData = {
  principal: 400000,
  interestRate: 5.5,
  amortizationYears: 25,
  frequency: 'monthly',
  grossAnnualIncome: 80000,
  monthlyDebts: 500
};

function toFiniteNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function MortgageCalculatorForm({ onCalculate, prefillData }: Props) {
  const [formData, setFormData] = useState<MortgageFormData>({
    ...DEFAULT_FORM_DATA,
  });

  // Merge prefilled values into the current form state (only when provided).
  useEffect(() => {
    if (!prefillData) return;
    setFormData(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(prefillData).filter(([, v]) => v !== undefined)
      ),
    }) as MortgageFormData);
  }, [prefillData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(formData);
  };

  const handleChange = (field: keyof MortgageFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Mortgage Calculator</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Principal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mortgage Amount ($)
          </label>
          <input
            type="number"
            value={formData.principal}
            onChange={(e) => handleChange('principal', toFiniteNumber(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interest Rate (%)
          </label>
          <input
            type="number"
            value={formData.interestRate}
            onChange={(e) => handleChange('interestRate', toFiniteNumber(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="20"
            step="0.01"
            required
          />
        </div>

        {/* Amortization */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amortization (years)
          </label>
          <select
            value={formData.amortizationYears}
            onChange={(e) => handleChange('amortizationYears', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="15">15 years</option>
            <option value="20">20 years</option>
            <option value="25">25 years</option>
            <option value="30">30 years</option>
          </select>
        </div>

        {/* Payment Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Frequency
          </label>
          <select
            value={formData.frequency}
            onChange={(e) => handleChange('frequency', e.target.value as PaymentFrequency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="monthly">Monthly</option>
            <option value="semi-monthly">Semi-Monthly</option>
            <option value="bi-weekly">Bi-Weekly</option>
            <option value="weekly">Weekly</option>
            <option value="accelerated-bi-weekly">Accelerated Bi-Weekly</option>
            <option value="accelerated-weekly">Accelerated Weekly</option>
          </select>
        </div>

        {/* Annual Income */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gross Annual Income ($)
          </label>
          <input
            type="number"
            value={formData.grossAnnualIncome}
            onChange={(e) => handleChange('grossAnnualIncome', toFiniteNumber(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Monthly Debts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Monthly Debts ($)
          </label>
          <input
            type="number"
            value={formData.monthlyDebts}
            onChange={(e) => handleChange('monthlyDebts', toFiniteNumber(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium transition-colors"
      >
        Calculate Affordability
      </button>
    </form>
  );
}
