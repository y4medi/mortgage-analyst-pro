export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mortgage Analyst Pro
          </h1>
          <p className="text-lg text-gray-600">
            AI-Powered Mortgage Portfolio Dashboard
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Client Management
            </h2>
            <p className="text-gray-600">
              Manage client information, income, and debt obligations.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Affordability Analysis
            </h2>
            <p className="text-gray-600">
              Calculate GDS/TDS ratios and mortgage affordability.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Stress Testing
            </h2>
            <p className="text-gray-600">
              Test mortgages against qualifying rates (+2%).
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Sensitivity Analysis
            </h2>
            <p className="text-gray-600">
              Visualize payment scenarios across rate ranges.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              AI Document Processing
            </h2>
            <p className="text-gray-600">
              Automated extraction of income and debt data.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              Portfolio Dashboard
            </h2>
            <p className="text-gray-600">
              Interactive charts and real-time analytics.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
