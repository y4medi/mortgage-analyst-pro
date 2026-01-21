// Client information
export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  grossAnnualIncome: number;
  monthlyDebts: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mortgage details
export interface Mortgage {
  id: string;
  clientId: string;
  principal: number;
  interestRate: number; // Annual rate as percentage (e.g., 5.5)
  amortizationYears: number;
  paymentFrequency: PaymentFrequency;
  mortgageType: MortgageType;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentFrequency =
  | 'monthly'
  | 'semi-monthly'
  | 'bi-weekly'
  | 'weekly'
  | 'accelerated-bi-weekly'
  | 'accelerated-weekly';

export type MortgageType = 'fixed' | 'variable' | 'mixed';

// Affordability calculation results
export interface AffordabilityResult {
  gdsRatio: number; // Gross Debt Service ratio
  tdsRatio: number; // Total Debt Service ratio
  monthlyHousingCosts: number;
  monthlyPayment: number;
  isAffordable: boolean;
  gdsThreshold: number; // Typically 32%
  tdsThreshold: number; // Typically 40%
}

// Stress test results
export interface StressTestResult {
  contractRate: number;
  stressRate: number; // Contract rate + 2%
  monthlyPaymentAtContract: number;
  monthlyPaymentAtStress: number;
  maxMortgageAtContract: number;
  maxMortgageAtStress: number;
  passesStressTest: boolean;
  affordabilityAtStress: AffordabilityResult;
}

// Sensitivity analysis data point
export interface SensitivityDataPoint {
  interestRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
}

// Amortization schedule entry
export interface AmortizationEntry {
  paymentNumber: number;
  paymentDate: Date;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

// AI Document extraction result
export interface DocumentAnalysis {
  extractedIncome?: number;
  extractedDebts?: number[];
  identifiedMortgageTerms?: {
    principal?: number;
    rate?: number;
    amortization?: number;
  };
  confidence: number;
  rawText: string;
}

// Payment calculation parameters
export interface PaymentCalculationParams {
  principal: number;
  annualRate: number; // As percentage
  amortizationYears: number;
  frequency: PaymentFrequency;
}

// Dashboard data aggregate
export interface DashboardData {
  client: Client;
  mortgage: Mortgage;
  affordability: AffordabilityResult;
  stressTest: StressTestResult;
  sensitivity: SensitivityDataPoint[];
  amortizationSchedule: AmortizationEntry[];
}
