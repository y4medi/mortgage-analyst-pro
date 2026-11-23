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

// Qualification ratio preset: conventional (32/40) or CMHC insured (39/44)
export type QualificationPreset = 'conventional' | 'insured';

// Which ratio limits the maximum mortgage
export type BindingConstraint = 'GDS' | 'TDS';

// Affordability calculation results
export interface AffordabilityResult {
  gdsRatio: number; // Gross Debt Service ratio
  tdsRatio: number; // Total Debt Service ratio
  monthlyHousingCosts: number;
  monthlyPayment: number;
  isAffordable: boolean;
  gdsThreshold: number; // 32% conventional, 39% CMHC insured
  tdsThreshold: number; // 40% conventional, 44% CMHC insured
}

// Stress test results
export interface StressTestResult {
  contractRate: number;
  stressRate: number; // Greater of contract rate + 2% or the 5.25% floor
  monthlyPaymentAtContract: number;
  monthlyPaymentAtStress: number;
  maxMortgageAtContract: number;
  maxMortgageAtStress: number;
  bindingConstraint: BindingConstraint; // Ratio that limits the max mortgage at the stress rate
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
  // Field-level evidence (the text each value was taken from), for human review
  evidence?: Record<string, string>;
}

// How a document was analyzed: Claude API, or deterministic rules in demo mode
export type AnalysisMode = 'ai' | 'demo';

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
