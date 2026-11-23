import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extractWithRules } from '@/services/ai/rule-based-extractor';

const sample = (name: string) =>
  readFileSync(join(__dirname, '..', 'public', 'samples', name), 'utf-8');

describe('rule-based document extraction (demo mode)', () => {
  it('sample documents are clearly marked synthetic', () => {
    for (const f of ['employment-letter.txt', 'pay-stub.txt', 'credit-debt-summary.txt']) {
      expect(sample(f)).toMatch(/SYNTHETIC SAMPLE DOCUMENT/);
    }
  });

  it('employment letter -> annual salary', () => {
    const r = extractWithRules(sample('employment-letter.txt'));
    expect(r.extractedIncome).toBe(96_500);
    expect(r.extractedDebts).toEqual([]);
    expect(r.evidence?.income).toMatch(/Annual base salary/);
  });

  it('pay stub -> per-period gross annualised by pay frequency (YTD ignored)', () => {
    const r = extractWithRules(sample('pay-stub.txt'));
    expect(r.extractedIncome).toBeCloseTo(3711.54 * 26, 2);
    expect(r.extractedDebts).toEqual([]);
  });

  it('credit/debt summary -> monthly debts and mortgage terms', () => {
    const r = extractWithRules(sample('credit-debt-summary.txt'));
    expect(r.extractedDebts).toEqual([126, 385, 210]);
    expect(r.identifiedMortgageTerms).toEqual({ principal: 480_000, rate: 4.79, amortization: 25 });
    expect(r.extractedIncome).toBeUndefined();
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(0.8);
  });

  it('is deterministic and returns zero confidence when nothing matches', () => {
    const text = 'Hello world, nothing financial here.';
    expect(extractWithRules(text)).toEqual(extractWithRules(text));
    expect(extractWithRules(text).confidence).toBe(0);
  });

  it('handles inline phrasing', () => {
    const r = extractWithRules(
      'Gross annual income $120,000\nCar payment: $450/month\nInterest rate 5.25%\n30-year amortization\nLoan amount: $650,000'
    );
    expect(r.extractedIncome).toBe(120_000);
    expect(r.extractedDebts).toEqual([450]);
    expect(r.identifiedMortgageTerms).toEqual({ principal: 650_000, rate: 5.25, amortization: 30 });
  });
});
