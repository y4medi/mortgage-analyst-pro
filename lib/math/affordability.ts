import type {
  AffordabilityResult,
  BindingConstraint,
  PaymentFrequency,
  PaymentCalculationParams,
  QualificationPreset
} from '@/types';
import { calculatePayment, convertToMonthlyPayment, calculateMaxMortgage } from './payment';

/**
 * Qualification ratio presets (GDS / TDS maximums, in percent).
 *
 * - conventional: common lender guideline for uninsured (20%+ down) mortgages.
 * - insured: CMHC limits for high-ratio insured mortgages (39% GDS / 44% TDS).
 *
 * Individual lenders and insurers (Sagen, Canada Guaranty) may apply
 * different limits or credit-score tiers; these are reference defaults only.
 */
export const QUALIFICATION_PRESETS: Record<
  QualificationPreset,
  { label: string; gdsThreshold: number; tdsThreshold: number }
> = {
  conventional: { label: 'Conventional', gdsThreshold: 32, tdsThreshold: 40 },
  insured: { label: 'CMHC insured', gdsThreshold: 39, tdsThreshold: 44 }
};

// Standard Canadian mortgage qualifying ratios (conventional preset)
export const DEFAULT_GDS_THRESHOLD = QUALIFICATION_PRESETS.conventional.gdsThreshold; // 32%
export const DEFAULT_TDS_THRESHOLD = QUALIFICATION_PRESETS.conventional.tdsThreshold; // 40%

/** Share of condo/strata fees counted in GDS/TDS (CMHC guideline: 50%). */
export const CONDO_FEE_GDS_SHARE = 0.5;

export function getQualificationThresholds(preset: QualificationPreset = 'conventional') {
  return QUALIFICATION_PRESETS[preset] ?? QUALIFICATION_PRESETS.conventional;
}

/**
 * Non-mortgage housing costs counted in GDS:
 * property tax + heating + 50% of condo fees (all monthly).
 */
export function calculateOtherHousingCosts(
  propertyTax: number = 0,
  heatingCost: number = 0,
  condoFees: number = 0
): number {
  return propertyTax + heatingCost + condoFees * CONDO_FEE_GDS_SHARE;
}

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

  // Total monthly housing costs (50% of condo fees per CMHC guidelines)
  const monthlyHousingCosts =
    monthlyPayment + calculateOtherHousingCosts(propertyTax, heatingCost, condoFees);

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
 * Calculate maximum affordable mortgage amount based on income and debts.
 * Works backwards from BOTH ratios and uses whichever is more restrictive:
 *
 *   max housing by GDS = GDS% × gross monthly income
 *   max housing by TDS = TDS% × gross monthly income − other monthly debts
 *   max mortgage payment = min(GDS, TDS housing) − (tax + heat + 50% condo)
 *
 * The resulting monthly budget is converted back to a principal for the given
 * payment frequency (Canadian semi-annual compounding).
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
  tdsThreshold: number = DEFAULT_TDS_THRESHOLD,
  frequency: PaymentFrequency = 'monthly'
): {
  maxByGDS: number;
  maxByTDS: number;
  maxMortgage: number;
  maxMonthlyPayment: number;
  bindingConstraint: BindingConstraint;
} {
  const grossMonthlyIncome = grossAnnualIncome / 12;
  const otherHousingCosts = calculateOtherHousingCosts(propertyTax, heatingCost, condoFees);

  const maxHousingCostsByGDS = (gdsThreshold / 100) * grossMonthlyIncome;
  const maxHousingCostsByTDS = (tdsThreshold / 100) * grossMonthlyIncome - monthlyDebts;

  const maxPaymentByGDS = Math.max(0, maxHousingCostsByGDS - otherHousingCosts);
  const maxPaymentByTDS = Math.max(0, maxHousingCostsByTDS - otherHousingCosts);
  const maxMonthlyPayment = Math.min(maxPaymentByGDS, maxPaymentByTDS);

  const toPrincipal = (monthlyBudget: number) =>
    calculateMaxMortgage(monthlyBudget, annualRate, amortizationYears, frequency);

  const maxByGDS = toPrincipal(maxPaymentByGDS);
  const maxByTDS = toPrincipal(maxPaymentByTDS);
  const maxMortgage = Math.min(maxByGDS, maxByTDS);

  return {
    maxByGDS: Math.round(maxByGDS * 100) / 100,
    maxByTDS: Math.round(maxByTDS * 100) / 100,
    maxMortgage: Math.round(maxMortgage * 100) / 100,
    maxMonthlyPayment: Math.round(maxMonthlyPayment * 100) / 100,
    bindingConstraint: maxPaymentByGDS <= maxPaymentByTDS ? 'GDS' : 'TDS'
  };
}
