import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/clients
 * Retrieve all clients
 */
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        mortgages: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch clients',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * Create a new client
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, grossAnnualIncome, monthlyDebts } = body;

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (typeof grossAnnualIncome !== 'number' || grossAnnualIncome < 0) {
      return NextResponse.json(
        { error: 'Valid gross annual income is required' },
        { status: 400 }
      );
    }

    if (typeof monthlyDebts !== 'number' || monthlyDebts < 0) {
      return NextResponse.json(
        { error: 'Valid monthly debts amount is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingClient = await prisma.client.findUnique({
      where: { email }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 }
      );
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phone || '',
        grossAnnualIncome,
        monthlyDebts
      }
    });

    return NextResponse.json({
      success: true,
      data: client
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      {
        error: 'Failed to create client',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients
 * Update an existing client
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, email, phone, grossAnnualIncome, monthlyDebts } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(grossAnnualIncome !== undefined && { grossAnnualIncome }),
        ...(monthlyDebts !== undefined && { monthlyDebts })
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedClient
    });

  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      {
        error: 'Failed to update client',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients
 * Delete a client
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { id }
    });

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete client (will cascade delete mortgages due to schema)
    await prisma.client.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete client',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
