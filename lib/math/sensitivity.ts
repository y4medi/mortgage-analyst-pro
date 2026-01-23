import type {
  SensitivityDataPoint,
  AmortizationEntry,
  PaymentFrequency
} from '@/types';
import {
  calculatePayment,
  convertToMonthlyPayment,
  calculateTotalInterest,
  getPaymentsPerYear,
  getPeriodicRate
} from './payment';

/**
 * Generate sensitivity analysis data across a range of interest rates
 * Perfect for feeding into Recharts line charts
 */
export function generateSensitivityAnalysis(
  principal: number,
  baseRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  rateStep: number = 0.25, // Rate increment (e.g., 0.25%)
  rangeAboveBelow: number = 3 // Range above/below base rate (e.g., ±3%)
): SensitivityDataPoint[] {
  const dataPoints: SensitivityDataPoint[] = [];

  const minRate = Math.max(0.1, baseRate - rangeAboveBelow);
  const maxRate = baseRate + rangeAboveBelow;

  for (let rate = minRate; rate <= maxRate; rate += rateStep) {
    const payment = calculatePayment({
      principal,
      annualRate: rate,
      amortizationYears,
      frequency
    });

    const monthlyPayment = convertToMonthlyPayment(payment, frequency);

    const totalInterest = calculateTotalInterest(
      principal,
      payment,
      frequency,
      amortizationYears
    );

    const totalCost = principal + totalInterest;

    dataPoints.push({
      interestRate: Math.round(rate * 100) / 100,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100
    });
  }

  return dataPoints;
}

/**
 * Generate amortization schedule showing principal/interest breakdown
 * per payment over the entire mortgage term
 * 
 * Note: Uses rounded intermediate calculations to prevent floating-point
 * precision errors from accumulating over many payments. The final payment
 * is adjusted to ensure the balance is exactly 0.
 */
export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency,
  startDate: Date = new Date()
): AmortizationEntry[] {
  const schedule: AmortizationEntry[] = [];

  const payment = calculatePayment({
    principal,
    annualRate,
    amortizationYears,
    frequency
  });

  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = getPeriodicRate(annualRate, paymentsPerYear);
  const totalPayments = amortizationYears * paymentsPerYear;

  // Round payment to cents to prevent propagation of tiny errors
  const roundedPayment = Math.round(payment * 100) / 100;

  // Round balance to cents to prevent error accumulation
  let balance = Math.round(principal * 100) / 100;
  let paymentDate = new Date(startDate);

  // Calculate days between payments
  const daysPerPayment = Math.floor(365 / paymentsPerYear);

  for (let i = 1; i <= totalPayments; i++) {
    const isLastPayment = i === totalPayments;

    // Interest portion - round to cents
    const interestPayment = balance * periodicRate;
    const roundedInterest = Math.round(interestPayment * 100) / 100;

    // Principal portion
    let principalPayment = roundedPayment - roundedInterest;

    // Adjust final payment to ensure balance = 0 exactly
    // This prevents floating-point errors from leaving a small remaining balance
    if (isLastPayment) {
      principalPayment = balance; // Pay remaining balance exactly
      const adjustedPayment = roundedInterest + principalPayment;

      schedule.push({
        paymentNumber: i,
        paymentDate: new Date(paymentDate),
        payment: Math.round(adjustedPayment * 100) / 100,
        principal: Math.round(principalPayment * 100) / 100,
        interest: roundedInterest,
        balance: 0 // Guaranteed to be 0
      });
      break;
    }

    // Update balance with rounded values to prevent error accumulation
    // Round after each calculation to prevent tiny errors from compounding
    balance = Math.max(0, Math.round((balance - principalPayment) * 100) / 100);

    schedule.push({
      paymentNumber: i,
      paymentDate: new Date(paymentDate),
      payment: roundedPayment,
      principal: Math.round(principalPayment * 100) / 100,
      interest: roundedInterest,
      balance: balance
    });

    // Move to next payment date
    paymentDate = new Date(paymentDate);
    paymentDate.setDate(paymentDate.getDate() + daysPerPayment);
  }

  return schedule;
}

/**
 * Generate aggregated amortization data (yearly summary)
 * Better for charts - shows yearly totals instead of every payment
 */
export function generateYearlyAmortizationSummary(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency
): Array<{
  year: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
  totalPaid: number;
}> {
  const fullSchedule = generateAmortizationSchedule(
    principal,
    annualRate,
    amortizationYears,
    frequency
  );

  const paymentsPerYear = getPaymentsPerYear(frequency);
  const yearlySummary: Array<{
    year: number;
    principalPaid: number;
    interestPaid: number;
    balance: number;
    totalPaid: number;
  }> = [];

  for (let year = 1; year <= amortizationYears; year++) {
    const startIdx = (year - 1) * paymentsPerYear;
    const endIdx = Math.min(year * paymentsPerYear, fullSchedule.length);

    const yearPayments = fullSchedule.slice(startIdx, endIdx);

    const principalPaid = yearPayments.reduce((sum, p) => sum + p.principal, 0);
    const interestPaid = yearPayments.reduce((sum, p) => sum + p.interest, 0);
    const totalPaid = principalPaid + interestPaid;
    const endBalance = yearPayments[yearPayments.length - 1]?.balance || 0;

    yearlySummary.push({
      year,
      principalPaid: Math.round(principalPaid * 100) / 100,
      interestPaid: Math.round(interestPaid * 100) / 100,
      balance: Math.round(endBalance * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100
    });
  }

  return yearlySummary;
}

/**
 * Compare different amortization periods
 * Shows how changing the amortization affects total cost
 */
export function compareAmortizationPeriods(
  principal: number,
  annualRate: number,
  frequency: PaymentFrequency,
  periods: number[] = [15, 20, 25, 30]
): Array<{
  years: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
}> {
  return periods.map(years => {
    const payment = calculatePayment({
      principal,
      annualRate,
      amortizationYears: years,
      frequency
    });

    const monthlyPayment = convertToMonthlyPayment(payment, frequency);

    const totalInterest = calculateTotalInterest(
      principal,
      payment,
      frequency,
      years
    );

    return {
      years,
      monthlyPayment: Math.round(monthlyPayment * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      totalCost: Math.round((principal + totalInterest) * 100) / 100
    };
  });
}

/**
 * Calculate breakeven point for different interest rates
 * Useful for comparing fixed vs variable rates
 */
export function calculateRateBreakeven(
  principal: number,
  fixedRate: number,
  variableRate: number,
  amortizationYears: number,
  frequency: PaymentFrequency
): {
  monthlyDifference: number;
  breakevenMonths: number;
  totalSavingsVariable: number;
} {
  const fixedPayment = calculatePayment({
    principal,
    annualRate: fixedRate,
    amortizationYears,
    frequency
  });

  const variablePayment = calculatePayment({
    principal,
    annualRate: variableRate,
    amortizationYears,
    frequency
  });

  const monthlyFixedPayment = convertToMonthlyPayment(fixedPayment, frequency);
  const monthlyVariablePayment = convertToMonthlyPayment(variablePayment, frequency);

  const monthlyDifference = monthlyFixedPayment - monthlyVariablePayment;

  // Calculate total interest for each
  const fixedTotalInterest = calculateTotalInterest(
    principal,
    fixedPayment,
    frequency,
    amortizationYears
  );

  const variableTotalInterest = calculateTotalInterest(
    principal,
    variablePayment,
    frequency,
    amortizationYears
  );

  const totalSavingsVariable = fixedTotalInterest - variableTotalInterest;

  return {
    monthlyDifference: Math.round(monthlyDifference * 100) / 100,
    breakevenMonths: monthlyDifference > 0 ? 0 : Infinity,
    totalSavingsVariable: Math.round(totalSavingsVariable * 100) / 100
  };
}
