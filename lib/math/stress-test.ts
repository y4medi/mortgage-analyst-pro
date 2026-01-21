import type {
  StressTestResult,
  PaymentFrequency,
  AffordabilityResult
} from '@/types';
import { calculatePayment, convertToMonthlyPayment, calculateMaxMortgage } from './payment';
import { calculateAffordability } from './affordability';

/**
 * Canadian mortgage stress test rate increase
 * Borrowers must qualify at the greater of:
 * - Contract rate + 2%
 * - 5.25% (Bank of Canada minimum qualifying rate)
 */
export const STRESS_TEST_RATE_INCREASE = 2.0; // 2%
export const MINIMUM_QUALIFYING_RATE = 5.25; // 5.25%

/**
 * Calculate the stress test qualifying rate
 */
export function getStressTestRate(contractRate: number): number {
  const stressedRate = contractRate + STRESS_TEST_RATE_INCREASE;
  return Math.max(stressedRate, MINIMUM_QUALIFYING_RATE);
}

/**
 * Perform a complete mortgage stress test
 * Tests whether the borrower can afford the mortgage at the stressed rate
 */
export function performStressTest(
  principal: number,
  contractRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  grossAnnualIncome: number,
  monthlyDebts: number,
  propertyTax: number = 0,
  heatingCost: number = 0,
  condoFees: number = 0
): StressTestResult {
  const stressRate = getStressTestRate(contractRate);

  // Calculate payment at contract rate
  const paymentAtContract = calculatePayment({
    principal,
    annualRate: contractRate,
    amortizationYears,
    frequency
  });
  const monthlyPaymentAtContract = convertToMonthlyPayment(paymentAtContract, frequency);

  // Calculate payment at stressed rate
  const paymentAtStress = calculatePayment({
    principal,
    annualRate: stressRate,
    amortizationYears,
    frequency
  });
  const monthlyPaymentAtStress = convertToMonthlyPayment(paymentAtStress, frequency);

  // Calculate affordability at stressed rate
  const affordabilityAtStress = calculateAffordability(
    principal,
    stressRate,
    amortizationYears,
    frequency,
    grossAnnualIncome,
    monthlyDebts,
    propertyTax,
    heatingCost,
    condoFees
  );

  // Calculate maximum mortgage at each rate
  // (How much could they borrow if we work backwards from their income)
  const grossMonthlyIncome = grossAnnualIncome / 12;

  // Use TDS as the binding constraint (typically 40%)
  const maxTotalDebt = 0.4 * grossMonthlyIncome;
  const maxHousingCosts = maxTotalDebt - monthlyDebts;
  const otherHousingCosts = propertyTax + heatingCost + (condoFees * 0.5);
  const maxPaymentAtContract = Math.max(0, maxHousingCosts - otherHousingCosts);

  const maxMortgageAtContract = calculateMaxMortgage(
    maxPaymentAtContract,
    contractRate,
    amortizationYears,
    frequency
  );

  const maxMortgageAtStress = calculateMaxMortgage(
    maxPaymentAtContract,
    stressRate,
    amortizationYears,
    frequency
  );

  // Determine if they pass the stress test
  const passesStressTest = affordabilityAtStress.isAffordable;

  return {
    contractRate: Math.round(contractRate * 100) / 100,
    stressRate: Math.round(stressRate * 100) / 100,
    monthlyPaymentAtContract: Math.round(monthlyPaymentAtContract * 100) / 100,
    monthlyPaymentAtStress: Math.round(monthlyPaymentAtStress * 100) / 100,
    maxMortgageAtContract: Math.round(maxMortgageAtContract * 100) / 100,
    maxMortgageAtStress: Math.round(maxMortgageAtStress * 100) / 100,
    passesStressTest,
    affordabilityAtStress
  };
}

/**
 * Calculate the impact of the stress test as a percentage
 */
export function calculateStressTestImpact(
  maxMortgageAtContract: number,
  maxMortgageAtStress: number
): number {
  if (maxMortgageAtContract === 0) return 0;

  const reduction = maxMortgageAtContract - maxMortgageAtStress;
  const percentageImpact = (reduction / maxMortgageAtContract) * 100;

  return Math.round(percentageImpact * 100) / 100;
}

/**
 * Determine if a mortgage qualifies under stress test rules
 */
export function qualifiesUnderStressTest(
  principal: number,
  contractRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  grossAnnualIncome: number,
  monthlyDebts: number,
  propertyTax: number = 0,
  heatingCost: number = 0,
  condoFees: number = 0
): boolean {
  const result = performStressTest(
    principal,
    contractRate,
    amortizationYears,
    frequency,
    grossAnnualIncome,
    monthlyDebts,
    propertyTax,
    heatingCost,
    condoFees
  );

  return result.passesStressTest;
}
