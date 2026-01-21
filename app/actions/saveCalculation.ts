'use server';

import { PrismaClient } from '@prisma/client';
import type { PaymentFrequency } from '@/types';

const prisma = new PrismaClient();

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
  error?: string;
}

/**
 * Server Action: Save calculation to database
 * Creates or updates client, then creates mortgage record
 */
export async function saveCalculation(
  input: SaveCalculationInput
): Promise<SaveCalculationResult> {
  try {
    // Check if client exists by email
    let client = await prisma.client.findUnique({
      where: { email: input.clientEmail }
    });

    if (client) {
      // Update existing client
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          name: input.clientName,
          phone: input.clientPhone || '',
          grossAnnualIncome: input.grossAnnualIncome,
          monthlyDebts: input.monthlyDebts
        }
      });
    } else {
      // Create new client
      client = await prisma.client.create({
        data: {
          name: input.clientName,
          email: input.clientEmail,
          phone: input.clientPhone || '',
          grossAnnualIncome: input.grossAnnualIncome,
          monthlyDebts: input.monthlyDebts
        }
      });
    }

    // Create mortgage record
    const mortgage = await prisma.mortgage.create({
      data: {
        clientId: client.id,
        principal: input.principal,
        interestRate: input.interestRate,
        amortizationYears: input.amortizationYears,
        paymentFrequency: input.paymentFrequency,
        mortgageType: input.mortgageType || 'fixed'
      }
    });

    return {
      success: true,
      clientId: client.id,
      mortgageId: mortgage.id
    };

  } catch (error) {
    console.error('Error saving calculation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
