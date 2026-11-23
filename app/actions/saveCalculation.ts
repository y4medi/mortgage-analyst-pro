'use server';

import { getRepository } from '@/lib/data/repository';
import type { PaymentFrequency } from '@/types';

export interface SaveCalculationInput {
  // Client data
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  grossAnnualIncome: number;
  monthlyDebts: number;

  // Mortgage data
  principal: number;
  interestRate: number;
  amortizationYears: number;
  paymentFrequency: PaymentFrequency;
  mortgageType?: 'fixed' | 'variable' | 'mixed';
}

export interface SaveCalculationResult {
  success: boolean;
  clientId?: string;
  mortgageId?: string;
  /** 'demo' when saved to the in-memory store (no DATABASE_URL). */
  mode?: 'database' | 'demo';
  error?: string;
}

/**
 * Server Action: Save calculation via the repository (PostgreSQL, or the
 * in-memory demo store when DATABASE_URL is unset).
 * Creates or updates client, then creates mortgage record
 */
export async function saveCalculation(
  input: SaveCalculationInput
): Promise<SaveCalculationResult> {
  try {
    const repo = getRepository();
    const clientData = {
      name: input.clientName,
      email: input.clientEmail,
      phone: input.clientPhone || '',
      grossAnnualIncome: input.grossAnnualIncome,
      monthlyDebts: input.monthlyDebts
    };

    // Update the client if the email is already known, otherwise create it
    const existing = await repo.findClientByEmail(input.clientEmail);
    const client = existing
      ? await repo.updateClient(existing.id, clientData)
      : await repo.createClient(clientData);

    // Create mortgage record
    const mortgage = await repo.createMortgage({
      clientId: client.id,
      principal: input.principal,
      interestRate: input.interestRate,
      amortizationYears: input.amortizationYears,
      paymentFrequency: input.paymentFrequency,
      mortgageType: input.mortgageType || 'fixed'
    });

    return {
      success: true,
      clientId: client.id,
      mortgageId: mortgage.id,
      mode: repo.mode
    };

  } catch (error) {
    console.error('Error saving calculation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
