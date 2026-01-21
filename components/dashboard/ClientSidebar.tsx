'use client';

import { useState, useEffect } from 'react';
import { calculateAffordability } from '@/lib/math';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  grossAnnualIncome: number;
  monthlyDebts: number;
  createdAt: string;
  mortgages: Array<{
    id: string;
    principal: number;
    interestRate: number;
    amortizationYears: number;
    paymentFrequency: string;
  }>;
}

interface Props {
  onClientSelect?: (client: Client) => void;
  refreshTrigger?: number;
}

export default function ClientSidebar({ onClientSelect, refreshTrigger }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load clients');
      }

      setClients(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [refreshTrigger]);

  const getAffordabilityStatus = (client: Client) => {
    if (!client.mortgages || client.mortgages.length === 0) {
      return { status: 'No Data', color: 'gray' };
    }

    const latestMortgage = client.mortgages[0];
    const affordability = calculateAffordability(
      latestMortgage.principal,
      latestMortgage.interestRate,
      latestMortgage.amortizationYears,
      latestMortgage.paymentFrequency as any,
      client.grossAnnualIncome,
      client.monthlyDebts
    );

    if (affordability.isAffordable) {
      return { status: 'Pass', color: 'green' };
    } else {
      return { status: 'Fail', color: 'red' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Saved Clients</h2>
        <div className="flex items-center justify-center py-8">
          <svg
            className="animate-spin h-8 w-8 text-blue-600"
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
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Saved Clients</h2>
        <button
          onClick={loadClients}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {clients.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="text-sm font-medium">No clients saved yet</p>
          <p className="text-xs mt-1">Save a calculation to see clients here</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {clients.map((client) => {
            const status = getAffordabilityStatus(client);
            return (
              <div
                key={client.id}
                onClick={() => onClientSelect?.(client)}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{client.email}</p>
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                      <span>Income: ${client.grossAnnualIncome.toLocaleString()}</span>
                      <span>Debts: ${client.monthlyDebts.toLocaleString()}/mo</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      status.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : status.color === 'red'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {status.status}
                  </span>
                </div>
                {client.mortgages && client.mortgages.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    Latest: ${client.mortgages[0].principal.toLocaleString()} @ {client.mortgages[0].interestRate}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
