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

  // Handle zero interest rate edge case
  if (annualRate === 0) {
    const paymentsPerYear = getPaymentsPerYear(frequency);
    const totalPayments = amortizationYears * paymentsPerYear;
    return principal / totalPayments;
  }

  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = getPeriodicRate(annualRate, paymentsPerYear);
  const totalPayments = amortizationYears * paymentsPerYear;

  // Mortgage payment formula
  const numerator = periodicRate * Math.pow(1 + periodicRate, totalPayments);
  const denominator = Math.pow(1 + periodicRate, totalPayments) - 1;

  const payment = principal * (numerator / denominator);

  // Handle accelerated payments
  if (frequency === 'accelerated-bi-weekly' || frequency === 'accelerated-weekly') {
    // Accelerated means you pay the monthly amount divided by frequency
    const monthlyPayment = calculatePayment({
      ...params,
      frequency: 'monthly'
    });

    if (frequency === 'accelerated-bi-weekly') {
      return monthlyPayment / 2;
    } else {
      return monthlyPayment / 4;
    }
  }

  return payment;
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
 * Calculate total interest paid over the life of the mortgage
 */
export function calculateTotalInterest(
  principal: number,
  payment: number,
  frequency: PaymentFrequency,
  amortizationYears: number
): number {
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const totalPayments = amortizationYears * paymentsPerYear;
  const totalPaid = payment * totalPayments;

  return totalPaid - principal;
}

/**
 * Calculate maximum mortgage amount for a given payment
 * This is the inverse of calculatePayment
 */
export function calculateMaxMortgage(
  monthlyPayment: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency = 'monthly'
): number {
  if (annualRate === 0) {
    const paymentsPerYear = getPaymentsPerYear(frequency);
    const totalPayments = amortizationYears * paymentsPerYear;
    return monthlyPayment * totalPayments;
  }

  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = getPeriodicRate(annualRate, paymentsPerYear);
  const totalPayments = amortizationYears * paymentsPerYear;

  // Rearrange payment formula to solve for principal
  const numerator = Math.pow(1 + periodicRate, totalPayments) - 1;
  const denominator = periodicRate * Math.pow(1 + periodicRate, totalPayments);

  return monthlyPayment * (numerator / denominator);
}
