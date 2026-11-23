import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/data/repository';

// Never prerender at build time: the data source is chosen at runtime.
export const dynamic = 'force-dynamic';

/**
 * POST /api/mortgages
 * Create a new mortgage calculation and save to database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      principal,
      interestRate,
      amortizationYears,
      paymentFrequency,
      mortgageType
    } = body;

    // Validation
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    if (typeof principal !== 'number' || principal <= 0) {
      return NextResponse.json(
        { error: 'Valid principal amount is required' },
        { status: 400 }
      );
    }

    if (typeof interestRate !== 'number' || interestRate < 0) {
      return NextResponse.json(
        { error: 'Valid interest rate is required' },
        { status: 400 }
      );
    }

    const repo = getRepository();

    // Check if client exists
    const client = await repo.findClientById(clientId);

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Create mortgage
    const mortgage = await repo.createMortgage({
      clientId,
      principal,
      interestRate,
      amortizationYears: amortizationYears || 25,
      paymentFrequency: paymentFrequency || 'monthly',
      mortgageType: mortgageType || 'fixed'
    });

    return NextResponse.json({
      success: true,
      mode: repo.mode,
      data: mortgage
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating mortgage:', error);
    return NextResponse.json(
      {
        error: 'Failed to create mortgage',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mortgages
 * Get all mortgages or filter by clientId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const repo = getRepository();
    const mortgages = await repo.listMortgages(clientId ?? undefined);

    return NextResponse.json({
      success: true,
      mode: repo.mode,
      data: mortgages
    });

  } catch (error) {
    console.error('Error fetching mortgages:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch mortgages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
