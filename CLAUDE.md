# SACDIA Admin - Panel Web

Panel administrativo con Next.js 16 y shadcn/ui.

## Comandos

```bash
pnpm install      # Instalar dependencias
pnpm dev          # Dev server (puerto 3001)
pnpm build        # Build producción
pnpm start        # Ejecutar build
pnpm lint         # Linter
```

## Estructura

```
app/
├── (auth)/         - Rutas de autenticación
├── (dashboard)/    - Rutas protegidas del dashboard
├── api/            - API routes de Next.js
└── layout.tsx      - Layout raíz

components/
├── ui/             - Componentes shadcn/ui
├── evidence-review/ - Validación de evidencias (gallery, filters, bulk ops)
├── sla/            - SLA Dashboard (métricas, gráficos, tarjetas)
├── investiture/    - Investiduras (bulk-action-bar.tsx para operaciones masivas)
└── [features]/     - Componentes por feature

lib/
└── utils.ts        - Utilidades (cn, etc.)
```

## Páginas de Coordinador/Admin

- `/dashboard/evidence-review` — Validación de evidencias (carpetas, clases, honores)
- `/dashboard/sla` — Dashboard SLA con métricas operacionales

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Icons**: lucide-react
- **Forms**: React Hook Form + Zod
- **Auth**: JWT cookies via backend API (sin dependencia Supabase)
- **State**: React Context (sin estado global complejo)

## Particularidades

- **App Router**: Usa `app/` directory
- **Server Components**: Por defecto, marcar con `'use client'` solo cuando necesario
- **Auth**: JWT almacenado en cookie httpOnly, validado contra el backend API (no hay cliente Supabase)
- **Styling**: Tailwind v4 + `cn()` utility de class-variance-authority
- **Forms**: Siempre validar con Zod + React Hook Form

## Autenticación

El admin no usa Supabase. La auth se resuelve llamando al backend API (`NEXT_PUBLIC_API_URL`).
No importar ni usar `@/lib/supabase/client` o `@/lib/supabase/server` — ese código fue eliminado en Wave 3.

## Variables de Entorno

Ver `.env.local.example`:

- `NEXT_PUBLIC_API_URL` (backend URL, ej: http://localhost:3000)

## Deployment

- **Platform**: Vercel
- **Build**: Automático en push a `main`
- **Preview**: PRs generan preview deployments
