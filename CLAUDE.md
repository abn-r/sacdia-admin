# SACDIA Admin - Panel Web

Panel administrativo con Next.js 16 y Studio Admin (shadcn/ui).

## Comandos

```bash
pnpm install      # Instalar dependencias
pnpm dev          # Dev server (puerto 3001)
pnpm build        # Build producción
pnpm start        # Ejecutar build
pnpm lint         # Linter
pnpm typecheck    # TypeScript
```

## Estado actual (rama `feat/studio-admin-reset`)

Reset en progreso: solo quedan el **cascarón Studio Admin** y el **sistema de auth SACDIA**. Los módulos de negocio se reconstruirán desde cero sobre esta base.

Plantilla de referencia: [next-shadcn-admin-dashboard](https://github.com/arhamkhnz/next-shadcn-admin-dashboard)

## Estructura

```
src/app/
├── (auth)/login/          - Login SACDIA (next-intl)
├── (dashboard)/           - Shell Studio Admin (sidebar, header, preferencias)
│   └── dashboard/         - Home + coming-soon
├── api/auth/              - Cookies JWT, refresh, logout, me
├── layout.tsx             - Root: preferencias Studio + i18n
└── globals.css            - Tailwind v4 + presets Studio

src/components/
├── auth/                  - Login form + brand panel
└── ui/                    - shadcn/ui (radix-nova, Studio Admin)

src/lib/auth/              - Session, cookies, RBAC, actions
src/navigation/sidebar/    - Nav config (mínima por ahora)
src/stores/preferences/    - Tema, layout, sidebar (Zustand)
src/styles/presets/        - Tangerine, Brutalist, Soft Pop
```

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI shell**: Studio Admin + shadcn/ui (radix-nova) + Tailwind CSS v4
- **Auth**: JWT cookies via backend API (`NEXT_PUBLIC_API_URL`)
- **i18n**: next-intl (login y metadata; catálogos se agregarán con módulos)
- **Preferencias**: Zustand + cookies (tema, layout, sidebar)

## Autenticación

El admin no usa Supabase. Auth vía backend API y cookies httpOnly.
Rutas `/dashboard/*` protegidas por `src/proxy.ts`.

## Variables de Entorno

Ver `.env.local.example`:

- `NEXT_PUBLIC_API_URL` (backend URL, ej: http://localhost:3000)

## Deployment

- **Platform**: Vercel
- **Build**: Automático en push a `main`
- **Preview**: PRs generan preview deployments
