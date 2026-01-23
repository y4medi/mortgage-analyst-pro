'use client';

import { useState } from 'react';
import MortgageCalculatorForm, { type MortgageFormData } from '@/components/forms/MortgageCalculatorForm';
import AffordabilityResults from '@/components/dashboard/AffordabilityResults';
import AIPanel from '@/components/dashboard/AIPanel';
import ClientSidebar from '@/components/dashboard/ClientSidebar';
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
import { saveCalculation } from '@/app/actions/saveCalculation';
import type {
  AffordabilityResult,
  StressTestResult,
  PaymentFrequency,
  SensitivityDataPoint,
  DocumentAnalysis
} from '@/types';

export default function Home() {
  const [results, setResults] = useState<{
    affordability: AffordabilityResult;
    stressTest: StressTestResult;
    sensitivityData: SensitivityDataPoint[];
    amortizationData: any[];
    comparisonData: any[];
    formData: any;
  } | null>(null);

  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const [currentFormData, setCurrentFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshClients, setRefreshClients] = useState(0);
  const [calculatorPrefill, setCalculatorPrefill] = useState<Partial<MortgageFormData> | undefined>(undefined);

  const sumDebts = (debts?: number[]) =>
    Array.isArray(debts) ? debts.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0) : 0;

  const handleAIDataExtracted = (data: DocumentAnalysis) => {
    const prefill: Partial<MortgageFormData> = {};

    if (data.identifiedMortgageTerms?.principal !== undefined) {
      prefill.principal = data.identifiedMortgageTerms.principal;
    }
    if (data.identifiedMortgageTerms?.rate !== undefined) {
      prefill.interestRate = data.identifiedMortgageTerms.rate;
    }
    if (data.identifiedMortgageTerms?.amortization !== undefined) {
      prefill.amortizationYears = data.identifiedMortgageTerms.amortization;
    }
    if (data.extractedIncome !== undefined) {
      prefill.grossAnnualIncome = data.extractedIncome;
    }
    if (data.extractedDebts && data.extractedDebts.length > 0) {
      prefill.monthlyDebts = sumDebts(data.extractedDebts);
    }

    if (Object.keys(prefill).length > 0) {
      setCalculatorPrefill(prefill);
    }
  };

  const handleCalculate = (formData: {
    principal: number;
    interestRate: number;
    amortizationYears: number;
    frequency: PaymentFrequency;
    grossAnnualIncome: number;
    monthlyDebts: number;
  }) => {
    // Store form data for later save
    setCurrentFormData(formData);

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

  const handleSaveToDatabase = async () => {
    if (!currentFormData || !clientInfo.name || !clientInfo.email) {
      setSaveMessage({
        type: 'error',
        text: 'Please enter client name and email before saving'
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const result = await saveCalculation({
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        grossAnnualIncome: currentFormData.grossAnnualIncome,
        monthlyDebts: currentFormData.monthlyDebts,
        principal: currentFormData.principal,
        interestRate: currentFormData.interestRate,
        amortizationYears: currentFormData.amortizationYears,
        paymentFrequency: currentFormData.frequency,
        mortgageType: 'fixed'
      });

      if (result.success) {
        setSaveMessage({
          type: 'success',
          text: 'Calculation saved successfully!'
        });
        setRefreshClients(prev => prev + 1);
        // Clear form after 2 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        setSaveMessage({
          type: 'error',
          text: result.error || 'Failed to save calculation'
        });
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: 'An error occurred while saving'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientSelect = (client: any) => {
    setClientInfo({
      name: client.name,
      email: client.email,
      phone: client.phone
    });

    // If client has mortgages, load the latest one
    if (client.mortgages && client.mortgages.length > 0) {
      const mortgage = client.mortgages[0];
      handleCalculate({
        principal: mortgage.principal,
        interestRate: mortgage.interestRate,
        amortizationYears: mortgage.amortizationYears,
        frequency: mortgage.paymentFrequency as PaymentFrequency,
        grossAnnualIncome: client.grossAnnualIncome,
        monthlyDebts: client.monthlyDebts
      });
    }
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

        {/* AI Document Upload Panel */}
        <div className="mb-8">
          <AIPanel onDataExtracted={handleAIDataExtracted} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column: Calculator Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>

            <MortgageCalculatorForm onCalculate={handleCalculate} prefillData={calculatorPrefill} />

            {/* Results Display */}
            {results ? (
              <>
                <AffordabilityResults
                  affordability={results.affordability}
                  stressTest={results.stressTest}
                />

                {/* Save to Database Button */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  {saveMessage && (
                    <div
                      className={`mb-4 p-3 rounded-md ${
                        saveMessage.type === 'success'
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : 'bg-red-50 border border-red-200 text-red-800'
                      }`}
                    >
                      {saveMessage.text}
                    </div>
                  )}
                  <button
                    onClick={handleSaveToDatabase}
                    disabled={isSaving || !results}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : '💾 Save to Database'}
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
                <div className="text-center text-gray-500 py-8">
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

          {/* Right Column: Client Sidebar */}
          <div className="lg:col-span-1">
            <ClientSidebar onClientSelect={handleClientSelect} refreshTrigger={refreshClients} />
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
