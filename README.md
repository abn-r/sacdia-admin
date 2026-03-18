# SACDIA Admin Panel

Panel de administración para el Sistema de Administración de Clubes de Conquistadores y JDVA (SACDIA).

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui
- **Backend:** Supabase
- **Forms:** React Hook Form + Zod
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 10+

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your Supabase credentials
```

### Development

```bash
# Run development server
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to view the admin panel.

## Project Structure

```
sacdia-admin/
├── src/
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   │   └── ui/          # shadcn/ui components
│   └── lib/
│       ├── supabase/    # Supabase clients
│       └── utils.ts     # Utility functions
├── public/              # Static assets
└── ...config files
```

## Environment Variables

See `.env.local.example` for required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: http://localhost:3000/api/v1)

## Related Repositories

- **Backend:** [sacdia-backend](https://github.com/abn-r/sacdia-backend)
- **Mobile App:** [sandia-app](https://github.com/abn-r/sandia-app)
- **Documentation:** [sacdia](https://github.com/abn-r/sacdia) (Coming soon)
