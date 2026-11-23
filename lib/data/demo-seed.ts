import type { DemoStore } from './repository';

/**
 * Synthetic borrowers for demo mode.
 * All names, emails (reserved example.com domain) and phone numbers
 * (555-01xx fictional range) are made up. They do not represent real people.
 */
export function createDemoSeed(now: Date = new Date()): DemoStore {
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const borrowers = [
    {
      id: 'demo-client-a',
      name: 'Sample Borrower A (synthetic)',
      email: 'sample.borrower.a@example.com',
      phone: '416-555-0101',
      grossAnnualIncome: 96_500,
      monthlyDebts: 350,
      createdAt: daysAgo(1),
      mortgage: { principal: 420_000, interestRate: 4.79, amortizationYears: 25, paymentFrequency: 'monthly', mortgageType: 'fixed' }
    },
    {
      id: 'demo-client-b',
      name: 'Sample Borrower B (synthetic)',
      email: 'sample.borrower.b@example.com',
      phone: '604-555-0102',
      grossAnnualIncome: 142_000,
      monthlyDebts: 900,
      createdAt: daysAgo(3),
      mortgage: { principal: 640_000, interestRate: 4.59, amortizationYears: 30, paymentFrequency: 'bi-weekly', mortgageType: 'variable' }
    },
    {
      id: 'demo-client-c',
      name: 'Sample Borrower C (synthetic)',
      email: 'sample.borrower.c@example.com',
      phone: '403-555-0103',
      grossAnnualIncome: 68_000,
      monthlyDebts: 1_100,
      createdAt: daysAgo(5),
      mortgage: { principal: 450_000, interestRate: 5.09, amortizationYears: 25, paymentFrequency: 'monthly', mortgageType: 'fixed' }
    },
    {
      id: 'demo-client-d',
      name: 'Sample Borrower D (synthetic)',
      email: 'sample.borrower.d@example.com',
      phone: '514-555-0104',
      grossAnnualIncome: 210_000,
      monthlyDebts: 0,
      createdAt: daysAgo(8),
      mortgage: { principal: 750_000, interestRate: 4.39, amortizationYears: 25, paymentFrequency: 'accelerated-bi-weekly', mortgageType: 'fixed' }
    }
  ];

  return {
    clients: borrowers.map(({ mortgage: _m, ...c }) => ({ ...c, updatedAt: c.createdAt })),
    mortgages: borrowers.map(b => ({
      id: `${b.id}-mortgage-1`,
      clientId: b.id,
      ...b.mortgage,
      createdAt: b.createdAt,
      updatedAt: b.createdAt
    }))
  };
}
