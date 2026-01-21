# Mortgage Analyst Pro

AI-Powered Mortgage Portfolio Dashboard for mortgage professionals featuring automated document processing, stress testing, and real-time decision-making analytics.

## Features

### Core Calculations
- **Affordability Analysis**: Calculate GDS/TDS ratios following Canadian mortgage guidelines
- **Stress Testing**: Apply +2% qualifying rate as per Canadian regulations
- **Sensitivity Analysis**: Visualize payment scenarios across different interest rates
- **Amortization Schedules**: Generate detailed payment breakdowns

### AI Document Processing
- Automated extraction of income data from documents
- Identification of debt obligations
- Mortgage term detection using Claude AI

### Interactive Visualizations
- Interest rate sensitivity charts
- Amortization schedule visualization
- Period comparison charts
- Real-time affordability indicators

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Charts**: Recharts
- **AI**: Anthropic Claude API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mortgage-analyst-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here
DATABASE_URL="file:./dev.db"
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
mortgage-analyst-pro/
├── app/                          # Next.js app directory
│   ├── api/                     # API routes
│   │   └── ai/                  # AI document processing endpoints
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Main dashboard page
├── components/                   # React components
│   ├── charts/                  # Recharts visualization components
│   ├── dashboard/               # Dashboard display components
│   └── forms/                   # Form components
├── lib/                         # Utility libraries
│   ├── math/                    # Mortgage calculation engine
│   │   ├── affordability.ts     # GDS/TDS calculations
│   │   ├── payment.ts           # Payment calculations
│   │   ├── sensitivity.ts       # Sensitivity analysis
│   │   └── stress-test.ts       # Stress testing
│   └── generated/               # Generated Prisma client
├── services/                    # External services
│   └── ai/                      # AI integration
│       └── document-analyzer.ts # Claude document processing
├── types/                       # TypeScript type definitions
│   └── index.ts                 # Shared types
├── prisma/                      # Database schema and migrations
│   ├── schema.prisma            # Prisma schema
│   └── dev.db                   # SQLite database
└── public/                      # Static assets

```

## Key Calculations

### GDS Ratio (Gross Debt Service)
```
GDS = (Monthly Housing Costs / Gross Monthly Income) × 100
Threshold: ≤ 32%
```

### TDS Ratio (Total Debt Service)
```
TDS = (Total Monthly Debt / Gross Monthly Income) × 100
Threshold: ≤ 40%
```

### Stress Test Rate
```
Qualifying Rate = max(Contract Rate + 2%, 5.25%)
```

### Payment Calculation
Canadian mortgages use semi-annual compounding:
```
Periodic Rate = (1 + Annual Rate / 2)^(2 / Payments Per Year) - 1
Payment = Principal × [r(1+r)^n] / [(1+r)^n - 1]
```

## API Routes

### POST /api/ai/analyze-document
Analyze a document using Claude AI to extract mortgage-relevant information.

**Request Body:**
```json
{
  "documentText": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "extractedIncome": 80000,
    "extractedDebts": [500, 300],
    "identifiedMortgageTerms": {
      "principal": 400000,
      "rate": 5.5,
      "amortization": 25
    },
    "confidence": 0.85,
    "rawText": "..."
  }
}
```

## Database Schema

### Client Model
- `id`: Unique identifier
- `name`: Client name
- `email`: Email address (unique)
- `phone`: Phone number
- `grossAnnualIncome`: Annual income
- `monthlyDebts`: Total monthly debt obligations
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### Mortgage Model
- `id`: Unique identifier
- `clientId`: Reference to Client
- `principal`: Mortgage amount
- `interestRate`: Annual interest rate (%)
- `amortizationYears`: Amortization period
- `paymentFrequency`: Payment frequency
- `mortgageType`: fixed, variable, or mixed
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Development

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

### Database Commands
```bash
# Create a migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Canadian Mortgage Guidelines

This application follows CMHC (Canada Mortgage and Housing Corporation) guidelines:

1. **GDS Ratio**: Maximum 32% of gross income for housing costs
2. **TDS Ratio**: Maximum 40% of gross income for total debt
3. **Stress Test**: Borrowers must qualify at the higher of:
   - Contract rate + 2%
   - 5.25% minimum qualifying rate
4. **Semi-Annual Compounding**: Canadian mortgages compound semi-annually, not monthly

## License

This project is for educational and professional use.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes (follow Conventional Commits)
4. Push to your branch
5. Open a Pull Request

## Support

For issues or questions, please open an issue on the GitHub repository.

---

Built with Claude Sonnet 4.5
