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

## i18n catalogs (24 catálogos)

- **Approach X**: español queda en columna principal, locales pt-BR/en/fr en tabla `<entity>_translations`. Backend overlay vía `TranslationService.translateMany` por `Accept-Language`.
- **12 Phase E + 12 generic** = 24 catálogos i18n-aware. Lista generic: countries, unions, local-fields, districts, churches, relationship-types, allergies, diseases, medicines, club-types, club-ideals, activity-types.
- **UI patterns**:
  - `PhaseECatalogCrudPage` (Dialog + tabs) — usado por 22 catálogos. Viola DS rule actualizada (tabs → dedicated page) pero deferred como tech debt.
  - **club-ideals dedicated page** (`components/catalogs/club-ideal-form-page.tsx`) — única página dedicada DS-compliant. Razón: >4 fields + relación club_type + tabs.
- **Componente**: `TranslationsTabsField` con prop `secondField?: SecondFieldConfig` (default `description`, override para `ideal` u otros).
- **Factory actions**: `lib/generic-catalogs-i18n/actions.ts` con `makeActions` extendido (`translatableFields`, `customFormFields`). Sync helpers en `helpers.ts` separados por constraint Next.js Server Actions ("use server" requires async exports).
- **Permissions**: 8 nuevos grupos (DISTRICTS/RELATIONSHIP_TYPES/ALLERGIES/DISEASES/MEDICINES/CLUB_TYPES/CLUB_IDEALS/ACTIVITY_TYPES) con READ/CREATE/UPDATE/DELETE + fallback CATALOGS_*.
- **Tech debt**: parent-filter regression para unions/local-fields/districts/churches (PhaseECatalogCrudPage no soporta filtros padre).

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
