import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Create mortgage
    const mortgage = await prisma.mortgage.create({
      data: {
        clientId,
        principal,
        interestRate,
        amortizationYears: amortizationYears || 25,
        paymentFrequency: paymentFrequency || 'monthly',
        mortgageType: mortgageType || 'fixed'
      },
      include: {
        client: true
      }
    });

    return NextResponse.json({
      success: true,
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

    const mortgages = await prisma.mortgage.findMany({
      where: clientId ? { clientId } : undefined,
      include: {
        client: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
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
