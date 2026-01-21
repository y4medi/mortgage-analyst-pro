import type {
  AffordabilityResult,
  PaymentFrequency,
  PaymentCalculationParams
} from '@/types';
import { calculatePayment, convertToMonthlyPayment } from './payment';

// Standard Canadian mortgage qualifying ratios
export const DEFAULT_GDS_THRESHOLD = 32; // 32%
export const DEFAULT_TDS_THRESHOLD = 40; // 40%

/**
 * Calculate Gross Debt Service (GDS) Ratio
 * GDS = (Monthly Housing Costs / Gross Monthly Income) × 100
 * Housing costs include: mortgage payment, property tax, heating, 50% of condo fees
 */
export function calculateGDS(
  monthlyHousingCosts: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome <= 0) return Infinity;
  return (monthlyHousingCosts / grossMonthlyIncome) * 100;
}

/**
 * Calculate Total Debt Service (TDS) Ratio
 * TDS = (Total Monthly Debt Payments / Gross Monthly Income) × 100
 * Includes housing costs plus all other debt obligations
 */
export function calculateTDS(
  monthlyHousingCosts: number,
  monthlyDebts: number,
  grossMonthlyIncome: number
): number {
  if (grossMonthlyIncome <= 0) return Infinity;
  const totalDebt = monthlyHousingCosts + monthlyDebts;
  return (totalDebt / grossMonthlyIncome) * 100;
}

/**
 * Calculate complete affordability analysis
 */
export function calculateAffordability(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  grossAnnualIncome: number,
  monthlyDebts: number,
  propertyTax: number = 0,
  heatingCost: number = 0,
  condoFees: number = 0,
  gdsThreshold: number = DEFAULT_GDS_THRESHOLD,
  tdsThreshold: number = DEFAULT_TDS_THRESHOLD
): AffordabilityResult {
  // Calculate mortgage payment
  const params: PaymentCalculationParams = {
    principal,
    annualRate,
    amortizationYears,
    frequency
  };

  const payment = calculatePayment(params);
  const monthlyPayment = convertToMonthlyPayment(payment, frequency);
  const grossMonthlyIncome = grossAnnualIncome / 12;

  // Calculate total monthly housing costs
  // Include 50% of condo fees as per CMHC guidelines
  const monthlyHousingCosts =
    monthlyPayment + propertyTax + heatingCost + (condoFees * 0.5);

  // Calculate ratios
  const gdsRatio = calculateGDS(monthlyHousingCosts, grossMonthlyIncome);
  const tdsRatio = calculateTDS(monthlyHousingCosts, monthlyDebts, grossMonthlyIncome);

  // Determine affordability
  const isAffordable = gdsRatio <= gdsThreshold && tdsRatio <= tdsThreshold;

  return {
    gdsRatio: Math.round(gdsRatio * 100) / 100, // Round to 2 decimals
    tdsRatio: Math.round(tdsRatio * 100) / 100,
    monthlyHousingCosts: Math.round(monthlyHousingCosts * 100) / 100,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    isAffordable,
    gdsThreshold,
    tdsThreshold
  };
}

/**
 * Calculate maximum affordable mortgage amount based on income and debts
 * This works backwards from the ratios to determine max borrowing capacity
 */
export function calculateMaxAffordableMortgage(
  grossAnnualIncome: number,
  monthlyDebts: number,
  annualRate: number,
  amortizationYears: number,
  propertyTax: number = 0,
  heatingCost: number = 0,
  condoFees: number = 0,
  gdsThreshold: number = DEFAULT_GDS_THRESHOLD,
  tdsThreshold: number = DEFAULT_TDS_THRESHOLD
): { maxByGDS: number; maxByTDS: number; maxMortgage: number } {
  const grossMonthlyIncome = grossAnnualIncome / 12;

  // Calculate max housing costs by GDS
  const maxHousingCostsByGDS = (gdsThreshold / 100) * grossMonthlyIncome;

  // Calculate max total debt by TDS
  const maxTotalDebtByTDS = (tdsThreshold / 100) * grossMonthlyIncome;
  const maxHousingCostsByTDS = maxTotalDebtByTDS - monthlyDebts;

  // Use the more restrictive limit
  const maxHousingCosts = Math.min(maxHousingCostsByGDS, maxHousingCostsByTDS);

  // Subtract other housing costs to get max mortgage payment
  const otherHousingCosts = propertyTax + heatingCost + (condoFees * 0.5);
  const maxMonthlyPayment = Math.max(0, maxHousingCosts - otherHousingCosts);

  // Convert to mortgage principal using payment formula (inverted)
  // For simplicity, use monthly frequency here
  const paymentsPerYear = 12;
  const rateDecimal = annualRate / 100;
  const semiAnnualRate = rateDecimal / 2;
  const periodicRate = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
  const totalPayments = amortizationYears * paymentsPerYear;

  let maxMortgage = 0;
  if (annualRate === 0) {
    maxMortgage = maxMonthlyPayment * totalPayments;
  } else {
    const numerator = Math.pow(1 + periodicRate, totalPayments) - 1;
    const denominator = periodicRate * Math.pow(1 + periodicRate, totalPayments);
    maxMortgage = maxMonthlyPayment * (numerator / denominator);
  }

  // Calculate individual maxes for comparison
  const maxPaymentByGDS = maxHousingCostsByGDS - otherHousingCosts;
  const maxPaymentByTDS = maxHousingCostsByTDS - otherHousingCosts;

  let maxByGDS = 0;
  let maxByTDS = 0;

  if (annualRate === 0) {
    maxByGDS = maxPaymentByGDS * totalPayments;
    maxByTDS = maxPaymentByTDS * totalPayments;
  } else {
    const numerator = Math.pow(1 + periodicRate, totalPayments) - 1;
    const denominator = periodicRate * Math.pow(1 + periodicRate, totalPayments);
    maxByGDS = maxPaymentByGDS * (numerator / denominator);
    maxByTDS = maxPaymentByTDS * (numerator / denominator);
  }

  return {
    maxByGDS: Math.max(0, Math.round(maxByGDS * 100) / 100),
    maxByTDS: Math.max(0, Math.round(maxByTDS * 100) / 100),
    maxMortgage: Math.max(0, Math.round(maxMortgage * 100) / 100)
  };
}
