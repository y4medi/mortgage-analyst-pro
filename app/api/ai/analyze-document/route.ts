import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/services/ai/document-analyzer';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for AI processing

/**
 * POST /api/ai/analyze-document
 * Analyzes a document using Claude AI to extract mortgage-relevant information
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { documentText } = body;

    // Validate input
    if (!documentText || typeof documentText !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid documentText parameter' },
        { status: 400 }
      );
    }

    if (documentText.length === 0) {
      return NextResponse.json(
        { error: 'Document text cannot be empty' },
        { status: 400 }
      );
    }

    if (documentText.length > 100000) {
      return NextResponse.json(
        { error: 'Document text too large (max 100,000 characters)' },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Set ANTHROPIC_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Analyze document
    const analysis = await analyzeDocument(documentText);

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error in analyze-document API:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        error: 'Failed to analyze document',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/analyze-document
 * Returns API information
 */
export async function GET() {
  return NextResponse.json({
    service: 'AI Document Analyzer',
    description: 'Extract mortgage-relevant information from documents using Claude AI',
    method: 'POST',
    parameters: {
      documentText: 'string (required) - The document text to analyze'
    },
    response: {
      extractedIncome: 'number | null',
      extractedDebts: 'number[]',
      identifiedMortgageTerms: {
        principal: 'number | null',
        rate: 'number | null',
        amortization: 'number | null'
      },
      confidence: 'number (0-1)',
      rawText: 'string'
    }
  });
}
