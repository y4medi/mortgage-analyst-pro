'use client';

import type { AffordabilityResult, StressTestResult } from '@/types';

interface Props {
  affordability: AffordabilityResult;
  stressTest: StressTestResult;
}

export default function AffordabilityResults({ affordability, stressTest }: Props) {
  return (
    <div className="space-y-6">
      {/* Affordability Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Affordability Analysis</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* GDS Ratio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">GDS Ratio</span>
              <span className={`text-lg font-bold ${
                affordability.gdsRatio <= affordability.gdsThreshold
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {affordability.gdsRatio.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  affordability.gdsRatio <= affordability.gdsThreshold
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min((affordability.gdsRatio / affordability.gdsThreshold) * 100, 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Threshold: {affordability.gdsThreshold}%
            </p>
          </div>

          {/* TDS Ratio */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">TDS Ratio</span>
              <span className={`text-lg font-bold ${
                affordability.tdsRatio <= affordability.tdsThreshold
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {affordability.tdsRatio.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  affordability.tdsRatio <= affordability.tdsThreshold
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}
                style={{
                  width: `${Math.min((affordability.tdsRatio / affordability.tdsThreshold) * 100, 100)}%`
                }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Threshold: {affordability.tdsThreshold}%
            </p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Monthly Payment</p>
              <p className="text-2xl font-bold text-gray-900">
                ${affordability.monthlyPayment.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Housing Costs</p>
              <p className="text-2xl font-bold text-gray-900">
                ${affordability.monthlyHousingCosts.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Overall Result */}
        <div className={`mt-6 p-4 rounded-lg ${
          affordability.isAffordable
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}>
          <p className={`text-center font-semibold ${
            affordability.isAffordable ? 'text-green-800' : 'text-red-800'
          }`}>
            {affordability.isAffordable
              ? '✓ Mortgage is Affordable'
              : '✗ Mortgage Exceeds Affordability Limits'}
          </p>
        </div>
      </div>

      {/* Stress Test Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Stress Test Results</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Contract Rate</p>
            <p className="text-xl font-bold text-gray-900">{stressTest.contractRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Monthly Payment</p>
            <p className="text-2xl font-bold text-blue-600">
              ${stressTest.monthlyPaymentAtContract.toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Stress Test Rate (+2%)</p>
            <p className="text-xl font-bold text-gray-900">{stressTest.stressRate}%</p>
            <p className="text-sm text-gray-600 mt-2">Monthly Payment</p>
            <p className="text-2xl font-bold text-orange-600">
              ${stressTest.monthlyPaymentAtStress.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Max at Contract Rate</p>
              <p className="text-xl font-semibold text-gray-900">
                ${stressTest.maxMortgageAtContract.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Max at Stress Rate</p>
              <p className="text-xl font-semibold text-gray-900">
                ${stressTest.maxMortgageAtStress.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`mt-6 p-4 rounded-lg ${
          stressTest.passesStressTest
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-orange-50 border-2 border-orange-200'
        }`}>
          <p className={`text-center font-semibold ${
            stressTest.passesStressTest ? 'text-green-800' : 'text-orange-800'
          }`}>
            {stressTest.passesStressTest
              ? '✓ Passes Stress Test'
              : '⚠ Does Not Pass Stress Test'}
          </p>
          {!stressTest.passesStressTest && (
            <p className="text-center text-sm text-orange-700 mt-2">
              Borrower may not qualify under current regulations
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
