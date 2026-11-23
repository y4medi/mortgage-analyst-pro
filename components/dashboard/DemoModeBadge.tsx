'use client';

import { useEffect, useState } from 'react';
import type { RuntimeMode } from '@/lib/runtime-mode';

/**
 * Small badge shown when the app runs on the in-memory store and/or the
 * rule-based document extractor (i.e. without DATABASE_URL / ANTHROPIC_API_KEY).
 */
export default function DemoModeBadge() {
  const [mode, setMode] = useState<RuntimeMode | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(res => (res.ok ? res.json() : null))
      .then(setMode)
      .catch(() => setMode(null));
  }, []);

  if (!mode?.demo) return null;

  const details = [
    mode.database === 'in-memory' && 'in-memory store with synthetic borrowers (resets on restart)',
    mode.documentAnalysis === 'rules' && 'rule-based document extraction instead of Claude'
  ]
    .filter(Boolean)
    .join('; ');

  return (
    <span
      title={`Demo mode: ${details}`}
      className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Demo mode — synthetic data
    </span>
  );
}
