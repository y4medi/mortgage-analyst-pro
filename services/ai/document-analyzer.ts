import Anthropic from '@anthropic-ai/sdk';
import type { DocumentAnalysis } from '@/types';

// Initialize the Anthropic client
// API key should be in environment variable ANTHROPIC_API_KEY
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

/**
 * Analyze a document to extract mortgage-relevant information
 * using Claude AI
 */
export async function analyzeDocument(
  documentText: string
): Promise<DocumentAnalysis> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = `You are a mortgage document analyzer. Extract the following information from the provided document:

1. Annual gross income (look for salary, wages, total income)
2. Monthly debt obligations (credit cards, loans, car payments, etc.)
3. Mortgage details if present (principal amount, interest rate, amortization period)

Return your analysis as a JSON object with this structure:
{
  "extractedIncome": number or null,
  "extractedDebts": [array of debt amounts] or [],
  "identifiedMortgageTerms": {
    "principal": number or null,
    "rate": number or null,
    "amortization": number or null
  },
  "confidence": number between 0 and 1
}

Document to analyze:
${documentText}

Provide ONLY the JSON response, no additional text.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Extract text from response
    const content = response.content[0];
    const responseText = content.type === 'text' ? content.text : '';

    // Parse JSON response
    let parsedData: any;
    try {
      // Try to extract JSON from the response (in case Claude adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate and structure the response
    const analysis: DocumentAnalysis = {
      extractedIncome: parsedData.extractedIncome || undefined,
      extractedDebts: Array.isArray(parsedData.extractedDebts)
        ? parsedData.extractedDebts
        : [],
      identifiedMortgageTerms: {
        principal: parsedData.identifiedMortgageTerms?.principal || undefined,
        rate: parsedData.identifiedMortgageTerms?.rate || undefined,
        amortization: parsedData.identifiedMortgageTerms?.amortization || undefined
      },
      confidence: parsedData.confidence || 0,
      rawText: documentText
    };

    return analysis;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Extract income information specifically from a document
 */
export async function extractIncome(documentText: string): Promise<number | null> {
  const prompt = `Extract the annual gross income from the following document.
Look for salary, wages, employment income, or total income.
Respond with ONLY the numeric value (no currency symbols or commas), or "null" if not found.

Document:
${documentText}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    const responseText = content.type === 'text' ? content.text.trim() : 'null';

    if (responseText === 'null' || responseText === '') {
      return null;
    }

    const income = parseFloat(responseText.replace(/[^0-9.]/g, ''));
    return isNaN(income) ? null : income;
  } catch (error) {
    console.error('Error extracting income:', error);
    return null;
  }
}

/**
 * Extract debt obligations from a document
 */
export async function extractDebts(documentText: string): Promise<number[]> {
  const prompt = `Extract all monthly debt obligations from the following document.
Look for: credit card payments, car loans, student loans, personal loans, etc.
Respond with a JSON array of numeric values (monthly payment amounts), or an empty array if none found.

Document:
${documentText}

Respond with ONLY a JSON array like: [500, 300, 150] or []`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    const responseText = content.type === 'text' ? content.text.trim() : '[]';

    const debts = JSON.parse(responseText);
    return Array.isArray(debts) ? debts : [];
  } catch (error) {
    console.error('Error extracting debts:', error);
    return [];
  }
}

/**
 * Summarize a mortgage document in plain language
 */
export async function summarizeDocument(documentText: string): Promise<string> {
  const prompt = `Provide a concise summary of the key mortgage-related information in this document.
Focus on: income, debts, mortgage amounts, interest rates, and affordability concerns.

Document:
${documentText}

Provide a 2-3 sentence summary.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : 'Unable to generate summary.';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Error generating document summary.';
  }
}
