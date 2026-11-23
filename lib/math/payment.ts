import type { PaymentFrequency, PaymentCalculationParams } from '@/types';

/**
 * Get the number of payments per year based on frequency
 */
export function getPaymentsPerYear(frequency: PaymentFrequency): number {
  switch (frequency) {
    case 'monthly':
      return 12;
    case 'semi-monthly':
      return 24;
    case 'bi-weekly':
      return 26;
    case 'weekly':
      return 52;
    case 'accelerated-bi-weekly':
      return 26;
    case 'accelerated-weekly':
      return 52;
    default:
      return 12;
  }
}

/**
 * Calculate periodic interest rate from annual rate
 * 
 * Canadian mortgages compound semi-annually, not monthly.
 * Formula: (1 + r/2)^(2/n) - 1
 * 
 * Note: Result is rounded to 10 decimal places to prevent tiny
 * floating-point precision errors from propagating through calculations.
 */
export function getPeriodicRate(annualRate: number, paymentsPerYear: number): number {
  // Convert percentage to decimal
  const rateDecimal = annualRate / 100;

  // Canadian mortgages compound semi-annually, not monthly
  // Formula: (1 + r/2)^(2/n) - 1
  const semiAnnualRate = rateDecimal / 2;
  const periodicRate = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;

  // Round to 10 decimal places to prevent precision errors from propagating
  // This is still more precise than needed (cents = 2 decimals) but prevents
  // tiny errors from accumulating in intermediate calculations
  return Math.round(periodicRate * 1e10) / 1e10;
}

/**
 * Calculate mortgage payment amount
 * Uses the standard mortgage payment formula: P = L[c(1 + c)^n]/[(1 + c)^n - 1]
 * Where:
 *   P = payment amount
 *   L = loan principal
 *   c = periodic interest rate
 *   n = total number of payments
 */
export function calculatePayment(params: PaymentCalculationParams): number {
  const { principal, annualRate, amortizationYears, frequency } = params;

  // Accelerated payments are defined relative to the monthly payment:
  // accelerated bi-weekly = monthly / 2, accelerated weekly = monthly / 4.
  // Handle them first so the zero-rate path follows the same rule.
  if (frequency === 'accelerated-bi-weekly' || frequency === 'accelerated-weekly') {
    const monthlyPayment = calculatePayment({ ...params, frequency: 'monthly' });
    return frequency === 'accelerated-bi-weekly' ? monthlyPayment / 2 : monthlyPayment / 4;
  }

  const paymentsPerYear = getPaymentsPerYear(frequency);
  const totalPayments = amortizationYears * paymentsPerYear;

  // Handle zero interest rate edge case
  if (annualRate === 0) {
    return principal / totalPayments;
  }

  const periodicRate = getPeriodicRate(annualRate, paymentsPerYear);

  // Mortgage payment formula
  const numerator = periodicRate * Math.pow(1 + periodicRate, totalPayments);
  const denominator = Math.pow(1 + periodicRate, totalPayments) - 1;

  return principal * (numerator / denominator);
}

/**
 * Convert any payment amount to monthly equivalent
 */
export function convertToMonthlyPayment(
  payment: number,
  frequency: PaymentFrequency
): number {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  return (payment * paymentsPerYear) / 12;
}

/**
 * Number of payments actually needed to retire `principal` with a fixed
 * per-period `payment`. Equals amortizationYears * paymentsPerYear for regular
 * frequencies, but is smaller for accelerated frequencies (which overpay and
 * therefore finish early).
 */
export function calculateNumberOfPayments(
  principal: number,
  payment: number,
  annualRate: number,
  frequency: PaymentFrequency
): number {
  if (principal <= 0) return 0;
  if (payment <= 0) return Infinity;
  if (annualRate === 0) return principal / payment;

  const periodicRate = getPeriodicRate(annualRate, getPaymentsPerYear(frequency));
  const interestOnly = principal * periodicRate;
  if (payment <= interestOnly) return Infinity;

  return -Math.log(1 - interestOnly / payment) / Math.log(1 + periodicRate);
}

/**
 * Calculate total interest paid over the life of the mortgage.
 *
 * `annualRate` is optional for backwards compatibility. When supplied, the
 * real payoff length is used, so accelerated frequencies correctly show the
 * interest they save instead of assuming a full amortization of overpayments.
 */
export function calculateTotalInterest(
  principal: number,
  payment: number,
  frequency: PaymentFrequency,
  amortizationYears: number,
  annualRate?: number
): number {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const scheduledPayments = amortizationYears * paymentsPerYear;
  const totalPayments =
    annualRate === undefined
      ? scheduledPayments
      : Math.min(
          scheduledPayments,
          calculateNumberOfPayments(principal, payment, annualRate, frequency)
        );
  const totalPaid = payment * totalPayments;

  return totalPaid - principal;
}

/**
 * Calculate the maximum principal whose payment, expressed as a MONTHLY
 * equivalent (the basis used for GDS/TDS), equals `monthlyPayment`.
 *
 * This is the exact inverse of
 *   convertToMonthlyPayment(calculatePayment({ principal, ... }), frequency)
 * and works for every frequency (including accelerated ones and 0% rates)
 * because the payment is linear in the principal.
 */
export function calculateMaxMortgage(
  monthlyPayment: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency = 'monthly'
): number {
  if (monthlyPayment <= 0) return 0;

  const monthlyPaymentPerDollar = convertToMonthlyPayment(
    calculatePayment({ principal: 1, annualRate, amortizationYears, frequency }),
    frequency
  );

  return monthlyPayment / monthlyPaymentPerDollar;
}
