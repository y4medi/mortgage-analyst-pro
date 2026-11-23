import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InMemoryMortgageRepository, getRepository } from '@/lib/data/repository';
import { getRuntimeMode } from '@/lib/runtime-mode';

describe('in-memory demo repository', () => {
  let repo: InMemoryMortgageRepository;
  beforeEach(() => {
    repo = new InMemoryMortgageRepository();
  });

  it('is seeded with clearly synthetic borrowers, newest first', async () => {
    const clients = await repo.listClients();
    expect(clients.length).toBeGreaterThanOrEqual(3);
    expect(clients.length).toBeLessThanOrEqual(4);
    for (const c of clients) {
      expect(c.name).toMatch(/^Sample Borrower [A-Z] \(synthetic\)$/);
      expect(c.email).toMatch(/@example\.com$/);
      expect(c.mortgages.length).toBeGreaterThan(0);
    }
    const times = clients.map(c => c.createdAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('creates clients and mortgages and lists the newest mortgage first', async () => {
    const client = await repo.createClient({
      name: 'Test Borrower',
      email: 'test@example.com',
      phone: '',
      grossAnnualIncome: 100_000,
      monthlyDebts: 0
    });
    await repo.createMortgage({
      clientId: client.id, principal: 1, interestRate: 5, amortizationYears: 25,
      paymentFrequency: 'monthly', mortgageType: 'fixed'
    });
    await new Promise(r => setTimeout(r, 5));
    const latest = await repo.createMortgage({
      clientId: client.id, principal: 2, interestRate: 5, amortizationYears: 25,
      paymentFrequency: 'monthly', mortgageType: 'fixed'
    });
    expect(latest.client.email).toBe('test@example.com');

    const [first] = await repo.listClients();
    expect(first.id).toBe(client.id);
    expect(first.mortgages[0].principal).toBe(2);
    expect(await repo.listMortgages(client.id)).toHaveLength(2);
  });

  it('rejects duplicate emails and cascades deletes', async () => {
    const [existing] = await repo.listClients();
    await expect(
      repo.createClient({ ...existing, email: existing.email.toUpperCase() })
    ).rejects.toThrow('already exists');

    await repo.deleteClient(existing.id);
    expect(await repo.findClientById(existing.id)).toBeNull();
    expect(await repo.listMortgages(existing.id)).toHaveLength(0);
  });
});

describe('repository selection', () => {
  const saved = { db: process.env.DATABASE_URL, ai: process.env.ANTHROPIC_API_KEY };
  afterEach(() => {
    process.env.DATABASE_URL = saved.db;
    process.env.ANTHROPIC_API_KEY = saved.ai;
    if (saved.db === undefined) delete process.env.DATABASE_URL;
    if (saved.ai === undefined) delete process.env.ANTHROPIC_API_KEY;
  });

  it('falls back to the demo store and reports demo mode when secrets are unset', () => {
    delete process.env.DATABASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
    expect(getRepository().mode).toBe('demo');
    expect(getRuntimeMode()).toEqual({ demo: true, database: 'in-memory', documentAnalysis: 'rules' });
  });

  it('treats a blank DATABASE_URL as unset', () => {
    process.env.DATABASE_URL = '  ';
    expect(getRepository().mode).toBe('demo');
  });
});
