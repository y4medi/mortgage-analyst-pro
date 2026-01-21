'use client';

import { useState } from 'react';
import type { DocumentAnalysis } from '@/types';

interface Props {
  onDataExtracted: (data: DocumentAnalysis) => void;
}

export default function AIPanel({ onDataExtracted }: Props) {
  const [documentText, setDocumentText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!documentText.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documentText })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze document');
      }

      setResult(data.data);
      onDataExtracted(data.data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setDocumentText('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">AI Document Analyzer</h2>
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 7H7v6h6V7z" />
            <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-purple-600 font-medium">Powered by Claude AI</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Paste document text below to automatically extract income, debts, and mortgage information.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Text
          </label>
          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste your document text here (pay stubs, loan statements, mortgage documents, etc.)..."
            className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isProcessing}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="text-sm font-semibold text-green-800 mb-2">✓ Extraction Complete</h3>
            <div className="space-y-2 text-sm text-green-700">
              {result.extractedIncome && (
                <p>
                  <span className="font-medium">Income:</span> $
                  {result.extractedIncome.toLocaleString()}
                </p>
              )}
              {result.extractedDebts && result.extractedDebts.length > 0 && (
                <p>
                  <span className="font-medium">Debts:</span> $
                  {result.extractedDebts.reduce((a, b) => a + b, 0).toLocaleString()} /month
                </p>
              )}
              {result.identifiedMortgageTerms?.principal && (
                <p>
                  <span className="font-medium">Mortgage Amount:</span> $
                  {result.identifiedMortgageTerms.principal.toLocaleString()}
                </p>
              )}
              {result.identifiedMortgageTerms?.rate && (
                <p>
                  <span className="font-medium">Interest Rate:</span>{' '}
                  {result.identifiedMortgageTerms.rate}%
                </p>
              )}
              <p className="text-xs mt-2">
                Confidence: {(result.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleAnalyze}
            disabled={isProcessing || !documentText.trim()}
            className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Document'
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
