import type {
  StressTestResult,
  PaymentFrequency
} from '@/types';
import { calculatePayment, convertToMonthlyPayment } from './payment';
import {
  calculateAffordability,
  calculateMaxAffordableMortgage,
  DEFAULT_GDS_THRESHOLD,
  DEFAULT_TDS_THRESHOLD
} from './affordability';

/**
 * Canadian mortgage stress test (minimum qualifying rate, "MQR").
 * Borrowers must qualify at the greater of:
 *   - contract rate + 2%, or
 *   - the 5.25% floor.
 *
 * Uninsured mortgages: OSFI Guideline B-20 (floor of 5.25% since June 2021).
 * Insured mortgages: the Department of Finance federal MQR uses the same
 * "greater of contract + 2% or 5.25%" rule.
 * This is the single source of truth for the floor; update it here if the
 * regulators change it.
 */
export const STRESS_TEST_RATE_INCREASE = 2.0; // percentage points over contract rate
export const MINIMUM_QUALIFYING_RATE = 5.25; // OSFI B-20 / federal MQR floor, in %

/**
 * Calculate the stress test qualifying rate
 */
export function getStressTestRate(contractRate: number): number {
  const stressedRate = contractRate + STRESS_TEST_RATE_INCREASE;
  return Math.max(stressedRate, MINIMUM_QUALIFYING_RATE);
}

/**
 * Perform a complete mortgage stress test
 * Tests whether the borrower can afford the mortgage at the stressed rate,
 * and how much they could borrow at the contract vs stressed rate using the
 * same GDS + TDS logic as the affordability check (whichever binds first).
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
  condoFees: number = 0,
  gdsThreshold: number = DEFAULT_GDS_THRESHOLD,
  tdsThreshold: number = DEFAULT_TDS_THRESHOLD
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
    condoFees,
    gdsThreshold,
    tdsThreshold
  );

  // Maximum mortgage at each rate, working backwards from income with
  // both GDS and TDS (the more restrictive one binds).
  const maxAt = (rate: number) =>
    calculateMaxAffordableMortgage(
      grossAnnualIncome,
      monthlyDebts,
      rate,
      amortizationYears,
      propertyTax,
      heatingCost,
      condoFees,
      gdsThreshold,
      tdsThreshold,
      frequency
    );

  const atContract = maxAt(contractRate);
  const atStress = maxAt(stressRate);

  return {
    contractRate: Math.round(contractRate * 100) / 100,
    stressRate: Math.round(stressRate * 100) / 100,
    monthlyPaymentAtContract: Math.round(monthlyPaymentAtContract * 100) / 100,
    monthlyPaymentAtStress: Math.round(monthlyPaymentAtStress * 100) / 100,
    maxMortgageAtContract: atContract.maxMortgage,
    maxMortgageAtStress: atStress.maxMortgage,
    bindingConstraint: atStress.bindingConstraint,
    passesStressTest: affordabilityAtStress.isAffordable,
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
  condoFees: number = 0,
  gdsThreshold: number = DEFAULT_GDS_THRESHOLD,
  tdsThreshold: number = DEFAULT_TDS_THRESHOLD
): boolean {
  return performStressTest(
    principal,
    contractRate,
    amortizationYears,
    frequency,
    grossAnnualIncome,
    monthlyDebts,
    propertyTax,
    heatingCost,
    condoFees,
    gdsThreshold,
    tdsThreshold
  ).passesStressTest;
}
