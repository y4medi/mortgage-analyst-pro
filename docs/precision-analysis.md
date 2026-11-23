# Floating-Point Precision Issues Analysis

## ⚠️ Identified Precision Issues

### 1. **Amortization Schedule Balance Accumulation** (CRITICAL)
**Location:** `lib/math/sensitivity.ts:85-99`

**Problem:**
```typescript
let balance = principal;
for (let i = 1; i <= totalPayments; i++) {
  const interestPayment = balance * periodicRate;
  const principalPayment = payment - interestPayment;
  balance = Math.max(0, balance - principalPayment);  // ⚠️ Precision error accumulates
}
```

**Issue:**
- Over 300 payments (25 years × 12 months), small floating-point errors accumulate
- Final balance may not be exactly `0.00` (could be `-0.01` or `0.01`)
- Each iteration: `balance - principalPayment` can introduce tiny errors (e.g., `0.0000000001`)
- After 300 iterations, this can compound to several cents

**Example:**
```
Payment 1: balance = 400000.00 - 1234.56 = 398765.44 (exact)
Payment 2: balance = 398765.44 - 1234.57 = 397530.8699999999 (precision error!)
...
Payment 300: balance = 0.01 (should be 0.00)
```

---

### 2. **Periodic Rate Calculation Precision**
**Location:** `lib/math/payment.ts:28-37`

**Problem:**
```typescript
const semiAnnualRate = rateDecimal / 2;
const periodicRate = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
```

**Issue:**
- Division `2 / paymentsPerYear` can produce repeating decimals (e.g., `2/26 = 0.0769230769...`)
- Exponentiation with floating-point can introduce tiny errors
- These errors propagate through all payment calculations

**Example:**
```
For bi-weekly (26 payments/year):
2 / 26 = 0.07692307692307693 (repeating decimal)
Math.pow(1.0275, 0.07692307692307693) might not be exactly precise
```

---

### 3. **Payment Formula Precision**
**Location:** `lib/math/payment.ts:64-67`

**Problem:**
```typescript
const numerator = periodicRate * Math.pow(1 + periodicRate, totalPayments);
const denominator = Math.pow(1 + periodicRate, totalPayments) - 1;
const payment = principal * (numerator / denominator);
```

**Issue:**
- Large exponentiation (`Math.pow(1 + periodicRate, 300)`) can lose precision
- Division of two large numbers can amplify small errors
- Result might be off by tiny amounts (e.g., `2456.7899999999` instead of `2456.79`)

---

### 4. **Accumulating Sum Errors**
**Location:** `lib/math/sensitivity.ts:156-158`

**Problem:**
```typescript
const principalPaid = yearPayments.reduce((sum, p) => sum + p.principal, 0);
const interestPaid = yearPayments.reduce((sum, p) => sum + p.interest, 0);
```

**Issue:**
- Summing many rounded values can still accumulate small errors
- Each `p.principal` is already rounded, but the sum might not match expected totals
- Over 25 years of monthly payments (300 values), errors can compound

---

### 5. **No Final Balance Correction**
**Location:** `lib/math/sensitivity.ts:91-113`

**Problem:**
- The amortization schedule doesn't adjust the final payment to ensure balance = 0
- Real-world mortgages adjust the last payment to clear the balance exactly
- Current code might end with `balance = 0.01` or `balance = -0.01`

---

## 🔧 Recommended Solutions

### Solution 1: Fix Amortization Schedule with Final Payment Adjustment

```typescript
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
  
  // Round payment to cents to avoid propagation of tiny errors
  const roundedPayment = Math.round(payment * 100) / 100;
  
  let balance = principal;
  let paymentDate = new Date(startDate);
  const daysPerPayment = Math.floor(365 / paymentsPerYear);
  
  for (let i = 1; i <= totalPayments; i++) {
    const isLastPayment = i === totalPayments;
    
    // Interest portion
    const interestPayment = balance * periodicRate;
    const roundedInterest = Math.round(interestPayment * 100) / 100;
    
    // Principal portion
    let principalPayment = roundedPayment - roundedInterest;
    
    // Adjust final payment to ensure balance = 0
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
    balance = Math.max(0, Math.round((balance - principalPayment) * 100) / 100);
    
    schedule.push({
      paymentNumber: i,
      paymentDate: new Date(paymentDate),
      payment: roundedPayment,
      principal: Math.round(principalPayment * 100) / 100,
      interest: roundedInterest,
      balance: balance
    });
    
    paymentDate = new Date(paymentDate);
    paymentDate.setDate(paymentDate.getDate() + daysPerPayment);
  }
  
  return schedule;
}
```

**Key Changes:**
- Round payment amount before using in loop
- Round balance after each calculation to prevent error accumulation
- Adjust final payment to ensure balance = 0 exactly

---

### Solution 2: Use Decimal Library for Critical Calculations

For production financial applications, consider using a decimal library:

```typescript
// Option A: decimal.js (most popular)
import Decimal from 'decimal.js';

function calculatePaymentDecimal(params: PaymentCalculationParams): number {
  const { principal, annualRate, amortizationYears, frequency } = params;
  
  const principalDec = new Decimal(principal);
  const rateDec = new Decimal(annualRate).div(100);
  const semiAnnualRate = rateDec.div(2);
  const paymentsPerYear = getPaymentsPerYear(frequency);
  const periodicRate = semiAnnualRate.add(1)
    .pow(2 / paymentsPerYear)
    .minus(1);
  
  const totalPayments = amortizationYears * paymentsPerYear;
  const onePlusRate = periodicRate.add(1);
  
  const numerator = periodicRate.mul(onePlusRate.pow(totalPayments));
  const denominator = onePlusRate.pow(totalPayments).minus(1);
  
  const payment = principalDec.mul(numerator.div(denominator));
  
  return payment.toNumber();
}
```

**Pros:**
- Exact decimal arithmetic
- No floating-point errors
- Industry standard for financial calculations

**Cons:**
- Additional dependency (~50KB)
- Slightly slower performance
- More verbose code

---

### Solution 3: Round Intermediate Calculations

```typescript
export function getPeriodicRate(annualRate: number, paymentsPerYear: number): number {
  const rateDecimal = annualRate / 100;
  const semiAnnualRate = rateDecimal / 2;
  
  // Round to 10 decimal places to prevent propagation of tiny errors
  const periodicRate = Math.pow(1 + semiAnnualRate, 2 / paymentsPerYear) - 1;
  
  // Round to prevent tiny precision errors
  return Math.round(periodicRate * 1e10) / 1e10;
}
```

---

### Solution 4: Add Precision Utilities

```typescript
// lib/math/precision.ts

/**
 * Round to cents (2 decimal places)
 */
export function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Round to prevent floating-point errors in intermediate calculations
 * Uses 10 decimal places for high precision
 */
export function roundPrecise(value: number, decimals: number = 10): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if two currency values are equal (within 1 cent tolerance)
 */
export function currencyEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

/**
 * Ensure balance doesn't go negative due to precision errors
 */
export function clampBalance(balance: number): number {
  return Math.max(0, roundToCents(balance));
}
```

---

## 📊 Impact Assessment

### Current Risk Level: **MEDIUM**

**Why it's not critical:**
- Errors are typically < 1 cent per calculation
- Results are rounded to 2 decimals for display
- For most use cases, the precision is acceptable

**Why it could be problematic:**
- Amortization schedules over 25-30 years can accumulate errors
- Final balance might not be exactly 0
- Regulatory compliance may require exact calculations
- Client trust issues if balances don't match bank statements

---

## ✅ Recommended Implementation Priority

1. **HIGH**: Fix amortization schedule final payment adjustment
2. **MEDIUM**: Round intermediate balance calculations
3. **LOW**: Consider decimal library for production (if regulatory requirements demand it)
4. **LOW**: Add precision utility functions for consistency

---

## 🧪 Testing for Precision Issues

```typescript
// Test that final balance is exactly 0
describe('Amortization Schedule Precision', () => {
  it('should have final balance of exactly 0', () => {
    const schedule = generateAmortizationSchedule(
      400000,
      5.5,
      25,
      'monthly'
    );
    
    const finalPayment = schedule[schedule.length - 1];
    expect(finalPayment.balance).toBe(0);
  });
  
  it('should sum principal payments to original principal', () => {
    const schedule = generateAmortizationSchedule(
      400000,
      5.5,
      25,
      'monthly'
    );
    
    const totalPrincipal = schedule.reduce(
      (sum, p) => sum + p.principal, 
      0
    );
    
    // Should be within 1 cent of original principal
    expect(Math.abs(totalPrincipal - 400000)).toBeLessThan(0.01);
  });
});
```

---

## 📝 Summary

**Current State:**
- ✅ Payment calculations are generally accurate
- ⚠️ Amortization schedules can accumulate small errors
- ⚠️ Final balance might not be exactly 0
- ✅ Display values are rounded correctly

**Recommended Actions:**
1. Fix final payment in amortization schedule
2. Round intermediate balance calculations
3. Add unit tests for precision
4. Consider decimal library if regulatory compliance requires it
