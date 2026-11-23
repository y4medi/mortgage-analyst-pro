import type { DocumentAnalysis } from '@/types';

/**
 * Deterministic, rule-based document extraction used in demo mode
 * (when ANTHROPIC_API_KEY is not configured).
 *
 * It looks for common phrasing in employment letters, pay stubs and
 * credit/debt summaries. It is intentionally simple and transparent: every
 * extracted value carries the source line as evidence so a broker can review
 * it before applying it to the calculator.
 */

const MONEY = String.raw`\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`;

function parseMoney(raw: string): number {
  return Number(raw.replace(/[$,\s]/g, ''));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}

const PAY_FREQUENCIES: Array<[RegExp, number, string]> = [
  [/semi[- ]?monthly/i, 24, 'semi-monthly'],
  [/bi[- ]?weekly/i, 26, 'bi-weekly'],
  [/\bweekly\b/i, 52, 'weekly'],
  [/\bmonthly\b/i, 12, 'monthly']
];

function extractIncome(all: string[]): { value?: number; evidence?: string } {
  // 1. Explicit annual figure (employment letter, application)
  const annual = new RegExp(
    String.raw`(?:annual|yearly)\s+(?:base\s+)?(?:salary|income|compensation)|gross\s+annual\s+income|salary\s+of`,
    'i'
  );
  for (const line of all) {
    if (!annual.test(line)) continue;
    const m = line.match(new RegExp(MONEY));
    if (m) return { value: round2(parseMoney(m[1])), evidence: line };
  }

  // 2. Pay stub: per-period gross pay × pays per year
  const freqLine = all.find(l => /pay\s+(?:frequency|period\s+type|schedule)/i.test(l));
  const freq = freqLine && PAY_FREQUENCIES.find(([re]) => re.test(freqLine));
  if (freq) {
    for (const line of all) {
      if (!/gross\s+(?:pay|earnings)/i.test(line)) continue;
      if (/ytd|year[- ]to[- ]date/i.test(line)) continue;
      const m = line.match(new RegExp(MONEY));
      if (m) {
        return {
          value: round2(parseMoney(m[1]) * freq[1]),
          evidence: `${line} × ${freq[1]} (${freq[2]} pay)`
        };
      }
    }
  }
  return {};
}

function extractDebts(all: string[]): { values: number[]; evidence: string[] } {
  const values: number[] = [];
  const evidence: string[] = [];
  const excluded =
    /mortgage|rent\b|salary|income|gross|net pay|down\s+payment|purchase price|property tax|heating|condo|deduction|summary|total/i;
  const afterPayment = new RegExp(
    String.raw`(?:minimum\s+)?(?:monthly\s+)?payment(?:\s*\/\s*month)?[^$\n]*?` + MONEY,
    'i'
  );
  const monthlyHint = /per\s+month|\/\s*mo(?:nth)?\b|monthly/i;

  for (const line of all) {
    if (excluded.test(line)) continue;
    let m = line.match(afterPayment);
    if (!m && monthlyHint.test(line)) {
      const amounts = [...line.matchAll(new RegExp(MONEY, 'g'))];
      if (amounts.length === 1) m = amounts[0];
    }
    if (m) {
      values.push(round2(parseMoney(m[1])));
      evidence.push(line);
    }
  }
  return { values, evidence };
}

function extractRate(all: string[]): { value?: number; evidence?: string } {
  const re = /(?:interest|contract|mortgage|fixed|variable)\s+rate[^%\n]{0,40}?(\d{1,2}(?:\.\d{1,3})?)\s?%/i;
  for (const line of all) {
    if (/qualif|stress|tax/i.test(line)) continue;
    const m = line.match(re);
    if (m) return { value: Number(m[1]), evidence: line };
  }
  return {};
}

function extractAmortization(all: string[]): { value?: number; evidence?: string } {
  const patterns = [
    /amortization[^\d\n]{0,20}(\d{1,2})\s*(?:-\s*)?(?:years?|yrs?)/i,
    /(\d{1,2})[- ]?(?:year|yr)\s+amortization/i
  ];
  for (const line of all) {
    for (const re of patterns) {
      const m = line.match(re);
      if (m) {
        const years = Number(m[1]);
        if (years >= 5 && years <= 40) return { value: years, evidence: line };
      }
    }
  }
  return {};
}

function extractPrincipal(all: string[]): { value?: number; evidence?: string } {
  const re = new RegExp(
    String.raw`(?:mortgage\s+amount|loan\s+amount|requested\s+mortgage|mortgage\s+requested|principal)[^$\n]{0,40}` + MONEY,
    'i'
  );
  for (const line of all) {
    const m = line.match(re);
    if (m) return { value: round2(parseMoney(m[1])), evidence: line };
  }
  return {};
}

export function extractWithRules(documentText: string): DocumentAnalysis {
  const all = lines(documentText);

  const income = extractIncome(all);
  const debts = extractDebts(all);
  const rate = extractRate(all);
  const amortization = extractAmortization(all);
  const principal = extractPrincipal(all);

  const evidence: Record<string, string> = {};
  if (income.evidence) evidence.income = income.evidence;
  if (debts.evidence.length) evidence.debts = debts.evidence.join(' | ');
  if (rate.evidence) evidence.rate = rate.evidence;
  if (amortization.evidence) evidence.amortization = amortization.evidence;
  if (principal.evidence) evidence.principal = principal.evidence;

  const found = Object.keys(evidence).length;
  // Heuristic: rules are transparent but brittle, so cap confidence well below 1.
  const confidence = found === 0 ? 0 : Math.min(0.8, round2(0.3 + 0.1 * found));

  return {
    extractedIncome: income.value,
    extractedDebts: debts.values,
    identifiedMortgageTerms: {
      principal: principal.value,
      rate: rate.value,
      amortization: amortization.value
    },
    confidence,
    rawText: documentText,
    evidence
  };
}
