'use client';

import { useState } from 'react';
import MortgageCalculatorForm from '@/components/forms/MortgageCalculatorForm';
import AffordabilityResults from '@/components/dashboard/AffordabilityResults';
import SensitivityChart from '@/components/charts/SensitivityChart';
import AmortizationChart from '@/components/charts/AmortizationChart';
import AmortizationComparisonChart from '@/components/charts/AmortizationComparisonChart';
import {
  calculateAffordability,
  performStressTest,
  generateSensitivityAnalysis,
  generateYearlyAmortizationSummary,
  compareAmortizationPeriods
} from '@/lib/math';
import type { AffordabilityResult, StressTestResult, PaymentFrequency, SensitivityDataPoint } from '@/types';

export default function Home() {
  const [results, setResults] = useState<{
    affordability: AffordabilityResult;
    stressTest: StressTestResult;
    sensitivityData: SensitivityDataPoint[];
    amortizationData: any[];
    comparisonData: any[];
    formData: any;
  } | null>(null);

  const handleCalculate = (formData: {
    principal: number;
    interestRate: number;
    amortizationYears: number;
    frequency: PaymentFrequency;
    grossAnnualIncome: number;
    monthlyDebts: number;
  }) => {
    // Calculate affordability
    const affordability = calculateAffordability(
      formData.principal,
      formData.interestRate,
      formData.amortizationYears,
      formData.frequency,
      formData.grossAnnualIncome,
      formData.monthlyDebts
    );

    // Perform stress test
    const stressTest = performStressTest(
      formData.principal,
      formData.interestRate,
      formData.amortizationYears,
      formData.frequency,
      formData.grossAnnualIncome,
      formData.monthlyDebts
    );

    // Generate sensitivity analysis data
    const sensitivityData = generateSensitivityAnalysis(
      formData.principal,
      formData.interestRate,
      formData.amortizationYears,
      formData.frequency
    );

    // Generate amortization schedule
    const amortizationData = generateYearlyAmortizationSummary(
      formData.principal,
      formData.interestRate,
      formData.amortizationYears,
      formData.frequency
    );

    // Compare different amortization periods
    const comparisonData = compareAmortizationPeriods(
      formData.principal,
      formData.interestRate,
      formData.frequency
    );

    setResults({
      affordability,
      stressTest,
      sensitivityData,
      amortizationData,
      comparisonData,
      formData
    });
  };

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mortgage Analyst Pro
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Mortgage Portfolio Dashboard
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Calculator Form */}
          <div>
            <MortgageCalculatorForm onCalculate={handleCalculate} />
          </div>

          {/* Results Display */}
          <div>
            {results ? (
              <AffordabilityResults
                affordability={results.affordability}
                stressTest={results.stressTest}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-lg font-medium">Enter mortgage details</p>
                  <p className="text-sm mt-2">Fill out the form to see affordability analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        {results && (
          <div className="space-y-8">
            <SensitivityChart
              data={results.sensitivityData}
              baseRate={results.formData.interestRate}
            />
            <AmortizationChart data={results.amortizationData} />
            <AmortizationComparisonChart data={results.comparisonData} />
          </div>
        )}
      </div>
    </main>
  );
}
