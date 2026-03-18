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
└── [features]/     - Componentes por feature

lib/
├── supabase/       - Cliente Supabase (SSR)
└── utils.ts        - Utilidades (cn, etc.)
```

## Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Icons**: lucide-react
- **Forms**: React Hook Form + Zod
- **Auth**: Supabase Auth (SSR)
- **State**: React Context (sin estado global complejo)

## Particularidades

- **App Router**: Usa `app/` directory
- **Server Components**: Por defecto, marcar con `'use client'` solo cuando necesario
- **Supabase SSR**: Usar `createClient()` con cookies para SSR
- **Styling**: Tailwind v4 + `cn()` utility de class-variance-authority
- **Forms**: Siempre validar con Zod + React Hook Form

## Autenticación

```typescript
// Server Component
import { createClient } from "@/lib/supabase/server";

const supabase = createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

// Client Component
("use client");
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
```

## Variables de Entorno

Ver `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` (backend URL)

## Deployment

- **Platform**: Vercel
- **Build**: Automático en push a `main`
- **Preview**: PRs generan preview deployments
