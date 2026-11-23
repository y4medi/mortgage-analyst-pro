import { NextResponse } from 'next/server';
import { getRuntimeMode } from '@/lib/runtime-mode';

// Evaluate per request so the badge reflects the deployed environment.
export const dynamic = 'force-dynamic';

/**
 * GET /api/status
 * Reports which backends are active (no secrets are exposed, only booleans).
 */
export async function GET() {
  return NextResponse.json(getRuntimeMode());
}
