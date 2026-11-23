import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/data/repository';

// Never prerender at build time: the data source is chosen at runtime.
export const dynamic = 'force-dynamic';

/**
 * GET /api/clients
 * Retrieve all clients
 */
export async function GET() {
  try {
    const repo = getRepository();
    const clients = await repo.listClients();

    return NextResponse.json({
      success: true,
      mode: repo.mode,
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

    const repo = getRepository();

    // Check if email already exists
    const existingClient = await repo.findClientByEmail(email);

    if (existingClient) {
      return NextResponse.json(
        { error: 'A client with this email already exists' },
        { status: 409 }
      );
    }

    // Create client
    const client = await repo.createClient({
      name,
      email,
      phone: phone || '',
      grossAnnualIncome,
      monthlyDebts
    });

    return NextResponse.json({
      success: true,
      mode: repo.mode,
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

    const repo = getRepository();

    // Check if client exists
    const existingClient = await repo.findClientById(id);

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update client
    const updatedClient = await repo.updateClient(id, {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(grossAnnualIncome !== undefined && { grossAnnualIncome }),
      ...(monthlyDebts !== undefined && { monthlyDebts })
    });

    return NextResponse.json({
      success: true,
      mode: repo.mode,
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

    const repo = getRepository();

    // Check if client exists
    const existingClient = await repo.findClientById(id);

    if (!existingClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete client (mortgages are deleted with it)
    await repo.deleteClient(id);

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
