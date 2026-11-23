import { PrismaClient } from '@prisma/client';
import { isDatabaseConfigured } from '@/lib/runtime-mode';
import { createDemoSeed } from './demo-seed';

/**
 * Data access layer.
 *
 * API routes and server actions talk to `getRepository()` only. It returns a
 * Prisma/PostgreSQL implementation when DATABASE_URL is set, otherwise an
 * in-memory implementation seeded with clearly synthetic borrowers (demo mode).
 */

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  grossAnnualIncome: number;
  monthlyDebts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MortgageRecord {
  id: string;
  clientId: string;
  principal: number;
  interestRate: number;
  amortizationYears: number;
  paymentFrequency: string;
  mortgageType: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ClientWithMortgages = ClientRecord & { mortgages: MortgageRecord[] };
export type MortgageWithClient = MortgageRecord & { client: ClientRecord };

export interface ClientInput {
  name: string;
  email: string;
  phone: string;
  grossAnnualIncome: number;
  monthlyDebts: number;
}

export interface MortgageInput {
  clientId: string;
  principal: number;
  interestRate: number;
  amortizationYears: number;
  paymentFrequency: string;
  mortgageType: string;
}

export interface MortgageRepository {
  readonly mode: 'database' | 'demo';
  /** All clients, newest first, each with mortgages newest first. */
  listClients(): Promise<ClientWithMortgages[]>;
  findClientById(id: string): Promise<ClientRecord | null>;
  findClientByEmail(email: string): Promise<ClientRecord | null>;
  createClient(data: ClientInput): Promise<ClientRecord>;
  updateClient(id: string, data: Partial<ClientInput>): Promise<ClientRecord>;
  /** Deletes the client and (cascade) its mortgages. */
  deleteClient(id: string): Promise<void>;
  createMortgage(data: MortgageInput): Promise<MortgageWithClient>;
  /** Mortgages newest first, optionally filtered by client. */
  listMortgages(clientId?: string): Promise<MortgageWithClient[]>;
}

// ---------------------------------------------------------------------------
// Prisma / PostgreSQL
// ---------------------------------------------------------------------------

class PrismaMortgageRepository implements MortgageRepository {
  readonly mode = 'database' as const;

  constructor(private readonly prisma: PrismaClient) {}

  listClients() {
    return this.prisma.client.findMany({
      include: { mortgages: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  findClientById(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  findClientByEmail(email: string) {
    return this.prisma.client.findUnique({ where: { email } });
  }

  createClient(data: ClientInput) {
    return this.prisma.client.create({ data });
  }

  updateClient(id: string, data: Partial<ClientInput>) {
    return this.prisma.client.update({ where: { id }, data });
  }

  async deleteClient(id: string) {
    await this.prisma.client.delete({ where: { id } });
  }

  createMortgage(data: MortgageInput) {
    return this.prisma.mortgage.create({ data, include: { client: true } });
  }

  listMortgages(clientId?: string) {
    return this.prisma.mortgage.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// ---------------------------------------------------------------------------
// In-memory (demo mode)
// ---------------------------------------------------------------------------

export interface DemoStore {
  clients: ClientRecord[];
  mortgages: MortgageRecord[];
}

const byNewest = (a: { createdAt: Date }, b: { createdAt: Date }) =>
  b.createdAt.getTime() - a.createdAt.getTime();

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export class InMemoryMortgageRepository implements MortgageRepository {
  readonly mode = 'demo' as const;

  constructor(private readonly store: DemoStore = createDemoSeed()) {}

  private withClient(m: MortgageRecord): MortgageWithClient {
    const client = this.store.clients.find(c => c.id === m.clientId)!;
    return { ...m, client: { ...client } };
  }

  async listClients() {
    return [...this.store.clients].sort(byNewest).map(c => ({
      ...c,
      mortgages: this.store.mortgages
        .filter(m => m.clientId === c.id)
        .sort(byNewest)
        .map(m => ({ ...m }))
    }));
  }

  async findClientById(id: string) {
    const c = this.store.clients.find(x => x.id === id);
    return c ? { ...c } : null;
  }

  async findClientByEmail(email: string) {
    const c = this.store.clients.find(x => x.email.toLowerCase() === email.toLowerCase());
    return c ? { ...c } : null;
  }

  async createClient(data: ClientInput) {
    if (await this.findClientByEmail(data.email)) {
      throw new Error('A client with this email already exists');
    }
    const now = new Date();
    const client: ClientRecord = { id: newId('demo-client'), ...data, createdAt: now, updatedAt: now };
    this.store.clients.push(client);
    return { ...client };
  }

  async updateClient(id: string, data: Partial<ClientInput>) {
    const client = this.store.clients.find(x => x.id === id);
    if (!client) throw new Error('Client not found');
    Object.assign(client, data, { updatedAt: new Date() });
    return { ...client };
  }

  async deleteClient(id: string) {
    this.store.clients = this.store.clients.filter(c => c.id !== id);
    this.store.mortgages = this.store.mortgages.filter(m => m.clientId !== id);
  }

  async createMortgage(data: MortgageInput) {
    if (!this.store.clients.some(c => c.id === data.clientId)) {
      throw new Error('Client not found');
    }
    const now = new Date();
    const mortgage: MortgageRecord = { id: newId('demo-mortgage'), ...data, createdAt: now, updatedAt: now };
    this.store.mortgages.push(mortgage);
    return this.withClient(mortgage);
  }

  async listMortgages(clientId?: string) {
    return this.store.mortgages
      .filter(m => !clientId || m.clientId === clientId)
      .sort(byNewest)
      .map(m => this.withClient(m));
  }
}

// ---------------------------------------------------------------------------
// Singleton selection (cached on globalThis so dev hot-reload and the
// different route bundles share one Prisma client / one demo store).
// ---------------------------------------------------------------------------

const globalForRepo = globalThis as unknown as {
  __prismaRepository?: PrismaMortgageRepository;
  __demoRepository?: InMemoryMortgageRepository;
};

export function getRepository(): MortgageRepository {
  if (isDatabaseConfigured()) {
    globalForRepo.__prismaRepository ??= new PrismaMortgageRepository(new PrismaClient());
    return globalForRepo.__prismaRepository;
  }
  globalForRepo.__demoRepository ??= new InMemoryMortgageRepository();
  return globalForRepo.__demoRepository;
}
