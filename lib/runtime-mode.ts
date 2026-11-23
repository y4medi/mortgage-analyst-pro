/**
 * Runtime mode detection.
 *
 * The app runs with zero secrets: when DATABASE_URL is missing it uses an
 * in-memory store seeded with synthetic borrowers, and when ANTHROPIC_API_KEY
 * is missing document intake falls back to deterministic rule-based extraction.
 */

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export interface RuntimeMode {
  demo: boolean;
  database: 'postgres' | 'in-memory';
  documentAnalysis: 'claude' | 'rules';
}

export function getRuntimeMode(): RuntimeMode {
  const database = isDatabaseConfigured() ? 'postgres' : 'in-memory';
  const documentAnalysis = isAIConfigured() ? 'claude' : 'rules';
  return {
    demo: database === 'in-memory' || documentAnalysis === 'rules',
    database,
    documentAnalysis
  };
}
