import { describe, it, expect } from '@jest/globals';
import {
  calculatePayment,
  convertToMonthlyPayment,
  calculateMaxMortgage,
  calculateTotalInterest,
  getPeriodicRate,
  calculateAffordability,
  calculateMaxAffordableMortgage,
  calculateGDS,
  calculateTDS,
  getQualificationThresholds,
  QUALIFICATION_PRESETS,
  getStressTestRate,
  performStressTest,
  MINIMUM_QUALIFYING_RATE,
  generateAmortizationSchedule,
  generateSensitivityAnalysis
} from '@/lib/math';

describe('payment (Canadian semi-annual compounding)', () => {
  it('$500,000 @ 5% over 25 years, monthly ≈ $2,908.02', () => {
    const payment = calculatePayment({
      principal: 500_000,
      annualRate: 5,
      amortizationYears: 25,
      frequency: 'monthly'
    });
    expect(payment).toBeCloseTo(2908.02, 2);
  });

  it('uses semi-annual (not monthly) compounding for the periodic rate', () => {
    // (1 + 0.05/2)^(2/12) - 1
    expect(getPeriodicRate(5, 12)).toBeCloseTo(0.0041239155, 9);
    // A US-style monthly-compounded loan would cost more per month
    const usStyle = (500_000 * (0.05 / 12)) / (1 - Math.pow(1 + 0.05 / 12, -300));
    expect(usStyle).toBeGreaterThan(2908.03);
  });

  it('accelerated bi-weekly is half the monthly payment', () => {
    const base = { principal: 500_000, annualRate: 5, amortizationYears: 25 };
    const monthly = calculatePayment({ ...base, frequency: 'monthly' });
    const accel = calculatePayment({ ...base, frequency: 'accelerated-bi-weekly' });
    expect(accel).toBeCloseTo(monthly / 2, 8);
  });

  it('accelerated payments pay the loan off early and save interest', () => {
    const base = { principal: 500_000, annualRate: 5, amortizationYears: 25 };
    const biweekly = calculatePayment({ ...base, frequency: 'bi-weekly' });
    const accel = calculatePayment({ ...base, frequency: 'accelerated-bi-weekly' });

    const schedule = generateAmortizationSchedule(500_000, 5, 25, 'accelerated-bi-weekly');
    expect(schedule.length).toBeLessThan(25 * 26);
    expect(schedule[schedule.length - 1].balance).toBe(0);

    const interestRegular = calculateTotalInterest(500_000, biweekly, 'bi-weekly', 25, 5);
    const interestAccel = calculateTotalInterest(500_000, accel, 'accelerated-bi-weekly', 25, 5);
    expect(interestAccel).toBeLessThan(interestRegular);
  });

  it('sensitivity analysis covers the full rate range without float drift', () => {
    const points = generateSensitivityAnalysis(400_000, 5, 25, 'monthly', 0.25, 3);
    expect(points[0].interestRate).toBe(2);
    expect(points[points.length - 1].interestRate).toBe(8);
    expect(points).toHaveLength(25);
  });
});

describe('zero-rate edge case', () => {
  it('payment is principal / number of payments', () => {
    expect(
      calculatePayment({ principal: 300_000, annualRate: 0, amortizationYears: 25, frequency: 'monthly' })
    ).toBeCloseTo(1000, 10);
  });

  it('accelerated bi-weekly at 0% still follows the monthly / 2 rule', () => {
    expect(
      calculatePayment({
        principal: 300_000,
        annualRate: 0,
        amortizationYears: 25,
        frequency: 'accelerated-bi-weekly'
      })
    ).toBeCloseTo(500, 10);
  });

  it('max mortgage at 0% inverts cleanly', () => {
    expect(calculateMaxMortgage(1000, 0, 25, 'monthly')).toBeCloseTo(300_000, 6);
  });

  it('stress test at 0% contract rate qualifies at the floor', () => {
    const result = performStressTest(300_000, 0, 25, 'monthly', 100_000, 0);
    expect(result.stressRate).toBe(MINIMUM_QUALIFYING_RATE);
    expect(result.monthlyPaymentAtContract).toBeCloseTo(1000, 2);
  });
});

describe('stress test qualifying rate (OSFI B-20 / MQR)', () => {
  it('floor of 5.25% applies when contract + 2% is lower', () => {
    expect(MINIMUM_QUALIFYING_RATE).toBe(5.25);
    expect(getStressTestRate(2.5)).toBe(5.25);
  });

  it('contract + 2% applies when it exceeds the floor', () => {
    expect(getStressTestRate(4.5)).toBe(6.5);
  });

  it('exactly at the boundary (3.25%) both rules give 5.25%', () => {
    expect(getStressTestRate(3.25)).toBe(5.25);
  });
});

describe('GDS / TDS ratios', () => {
  it('basic ratio formulas', () => {
    expect(calculateGDS(2000, 8000)).toBe(25);
    expect(calculateTDS(2000, 800, 8000)).toBe(35);
    expect(calculateGDS(100, 0)).toBe(Infinity);
  });

  it('includes property tax, heating and 50% of condo fees', () => {
    // principal 0 isolates the non-mortgage housing costs
    const result = calculateAffordability(
      0, 5, 25, 'monthly',
      60_000, // $5,000 / month
      250,    // other debts
      200,    // property tax
      100,    // heating
      400     // condo fees -> only $200 counts
    );
    expect(result.monthlyHousingCosts).toBe(500);
    expect(result.gdsRatio).toBe(10);
    expect(result.tdsRatio).toBe(15);
  });

  it('flags a mortgage that breaches GDS even though TDS is fine', () => {
    const result = calculateAffordability(
      600_000, 5, 25, 'monthly', 120_000, 0, 300, 100, 0
    );
    // payment ≈ 3489.62 + 400 = 3889.62 on $10,000/month
    expect(result.gdsRatio).toBeCloseTo(38.9, 1);
    expect(result.tdsRatio).toBeCloseTo(38.9, 1);
    expect(result.isAffordable).toBe(false);
  });
});

describe('max mortgage (GDS + TDS binding)', () => {
  const income = 120_000; // $10,000 / month
  const tax = 300;
  const heat = 100;

  it('round-trip: payment on the max mortgage reproduces the binding ratio', () => {
    const cases = [
      { debts: 0, expectBinding: 'GDS' as const },
      { debts: 1500, expectBinding: 'TDS' as const }
    ];
    for (const { debts, expectBinding } of cases) {
      const max = calculateMaxAffordableMortgage(income, debts, 5, 25, tax, heat, 0);
      expect(max.bindingConstraint).toBe(expectBinding);

      const check = calculateAffordability(max.maxMortgage, 5, 25, 'monthly', income, debts, tax, heat, 0);
      if (expectBinding === 'GDS') {
        expect(check.gdsRatio).toBeCloseTo(32, 2);
        expect(check.tdsRatio).toBeLessThanOrEqual(40);
      } else {
        expect(check.tdsRatio).toBeCloseTo(40, 2);
        expect(check.gdsRatio).toBeLessThanOrEqual(32);
      }
    }
  });

  it('round-trip holds for bi-weekly and accelerated frequencies too', () => {
    for (const frequency of ['bi-weekly', 'weekly', 'accelerated-bi-weekly'] as const) {
      const max = calculateMaxAffordableMortgage(
        income, 0, 5, 25, tax, heat, 0, 32, 40, frequency
      );
      const payment = calculatePayment({
        principal: max.maxMortgage, annualRate: 5, amortizationYears: 25, frequency
      });
      expect(convertToMonthlyPayment(payment, frequency)).toBeCloseTo(max.maxMonthlyPayment, 1);
    }
  });

  it('stress test respects GDS when GDS binds (regression for hardcoded 40% TDS)', () => {
    // GDS budget: 32% × 10,000 − 400 = 2,800; TDS budget: 40% × 10,000 − 400 = 3,600.
    const result = performStressTest(500_000, 4.5, 25, 'monthly', income, 0, tax, heat, 0);
    expect(result.stressRate).toBe(6.5);
    expect(result.bindingConstraint).toBe('GDS');

    expect(result.maxMortgageAtStress).toBeCloseTo(calculateMaxMortgage(2800, 6.5, 25), 1);
    expect(result.maxMortgageAtContract).toBeCloseTo(calculateMaxMortgage(2800, 4.5, 25), 1);

    // The old implementation used the TDS budget (3,600) — ~29% too high.
    const oldBuggyValue = calculateMaxMortgage(3600, 6.5, 25);
    expect(result.maxMortgageAtStress).toBeLessThan(oldBuggyValue * 0.8);

    // Borrowing the stress-test max puts GDS exactly at 32% at the qualifying rate
    const atLimit = calculateAffordability(
      result.maxMortgageAtStress, 6.5, 25, 'monthly', income, 0, tax, heat, 0
    );
    expect(atLimit.gdsRatio).toBeCloseTo(32, 2);
  });

  it('stress-test max mortgage honours the payment frequency', () => {
    const monthly = performStressTest(500_000, 4.5, 25, 'monthly', income, 0, tax, heat, 0);
    const accel = performStressTest(500_000, 4.5, 25, 'accelerated-bi-weekly', income, 0, tax, heat, 0);
    // Accelerated payments cost more per month, so the same budget supports less principal
    expect(accel.maxMortgageAtStress).toBeLessThan(monthly.maxMortgageAtStress);
  });

  it('returns 0 when debts already exceed the TDS limit', () => {
    const max = calculateMaxAffordableMortgage(60_000, 3000, 5, 25);
    expect(max.maxMortgage).toBe(0);
    expect(max.bindingConstraint).toBe('TDS');
  });
});

describe('qualification presets', () => {
  it('conventional is 32/40 and CMHC insured is 39/44', () => {
    expect(QUALIFICATION_PRESETS.conventional).toMatchObject({ gdsThreshold: 32, tdsThreshold: 40 });
    expect(QUALIFICATION_PRESETS.insured).toMatchObject({ gdsThreshold: 39, tdsThreshold: 44 });
    expect(getQualificationThresholds()).toBe(QUALIFICATION_PRESETS.conventional);
  });

  it('a file that fails conventional ratios can pass insured ratios', () => {
    const args = [600_000, 5, 25, 'monthly', 120_000, 0, 300, 100, 0] as const;
    const conventional = calculateAffordability(...args);
    const { gdsThreshold, tdsThreshold } = getQualificationThresholds('insured');
    const insured = calculateAffordability(...args, gdsThreshold, tdsThreshold);

    expect(conventional.isAffordable).toBe(false);
    expect(insured.isAffordable).toBe(true);
    expect(insured.gdsThreshold).toBe(39);
    expect(insured.tdsThreshold).toBe(44);
  });

  it('insured preset raises max mortgage and is threaded through the stress test', () => {
    const { gdsThreshold, tdsThreshold } = getQualificationThresholds('insured');
    const conventional = performStressTest(500_000, 4.5, 25, 'monthly', 120_000, 0, 300, 100, 0);
    const insured = performStressTest(
      500_000, 4.5, 25, 'monthly', 120_000, 0, 300, 100, 0, gdsThreshold, tdsThreshold
    );
    expect(insured.affordabilityAtStress.gdsThreshold).toBe(39);
    // GDS budget: 39% × 10,000 − 400 = 3,500
    expect(insured.maxMortgageAtStress).toBeCloseTo(calculateMaxMortgage(3500, 6.5, 25), 1);
    expect(insured.maxMortgageAtStress).toBeGreaterThan(conventional.maxMortgageAtStress);
  });
});
