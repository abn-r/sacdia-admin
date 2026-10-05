# SACDIA Admin Panel

Panel de administración del Sistema de Administración de Clubes JA (SACDIA): Conquistadores, Aventureros y Guías Mayores.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui + Hugeicons
- **Data:** TanStack Query + server actions
- **i18n:** next-intl (es, en, fr, pt-BR)
- **Backend:** NestJS API (`sacdia-backend`)
- **Forms:** React Hook Form + Zod
- **Package Manager:** pnpm

## Getting Started

### Prerequisites

- Node.js 22 (versión usada en CI)
- pnpm 10+

### Installation

```bash
pnpm install
```

Crea `.env.local` con al menos:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Variables opcionales: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`, `NEXT_PUBLIC_RBAC_LEGACY_FALLBACK`.

### Development

```bash
pnpm dev        # http://localhost:3001
pnpm lint
pnpm typecheck
pnpm test
```

## Project Structure

```
sacdia-admin/
├── src/
│   ├── app/              # App Router: (auth), (dashboard), (printable), api/auth
│   ├── components/       # Componentes por dominio + ui/ (shadcn)
│   ├── lib/              # Clientes API, auth, screen catalog, i18n, utilidades
│   ├── navigation/       # Sidebar
│   ├── stores/           # Zustand (preferencias)
│   ├── i18n/             # Configuración next-intl
│   └── proxy.ts          # Protección de /dashboard/*
├── messages/             # Traducciones de UI
├── scripts/              # Auditoría de design system, smoke e2e, iconos
├── tests/                # Mocks MSW
└── public/               # Static assets
```

Ver `CLAUDE.md` para el detalle de la estructura y `DESIGN-SYSTEM.md` para las reglas de UI.

## Related Repositories

- **Backend:** [sacdia-backend](https://github.com/abn-r/sacdia-backend)
- **Mobile App:** [sacdia-app](https://github.com/abn-r/sacdia-app)
- **Documentación:** workspace `sacdia` (`../docs`)
