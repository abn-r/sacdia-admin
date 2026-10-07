# SACDIA Admin - Panel Web

Panel administrativo de SACDIA con Next.js 16 (App Router) y shadcn/ui. Consume la API de `sacdia-backend`.

## Comandos

```bash
pnpm install               # Instalar dependencias
pnpm dev                   # Dev server (puerto 3001)
pnpm build                 # Build producción
pnpm start                 # Ejecutar build (puerto 3001)
pnpm lint                  # ESLint
pnpm typecheck             # tsc --noEmit
pnpm test                  # Vitest (jsdom)
pnpm test:e2e:smoke        # Smoke e2e (scripts/e2e-smoke.mjs)
pnpm audit:design-system   # Auditoría del design system (--strict para fallar en errores)
pnpm icons:generate        # Regenera el compat de iconos Hugeicons
pnpm analyze               # Análisis de bundle (next experimental-analyze)
```

## Estado actual

El "studio admin reset" ya se completó y los módulos de negocio están reconstruidos sobre el shell: `src/app` tiene unas 140 páginas. No existe un panel v2 separado: `/dashboard/v2` solo redirige al dashboard de operaciones, y `src/lib/v2/` conserva únicamente `route-map.ts` y `panel-path-context.tsx`.

## Estructura

Todo el código vive en `src/`:

```
src/app/
├── (auth)/login/              - Login (next-intl)
├── (dashboard)/dashboard/     - Panel: home = dashboard de operaciones
│   ├── catalogs/              - Catálogos (geografía, referencia, clases, honores, maestrías, certificaciones…)
│   ├── clubs/                 - Clubes, actividades, carpetas de evidencias, validaciones, importación
│   ├── users/                 - Usuarios, alta, carga masiva
│   ├── annual-folders/        - Carpeta anual: plantillas, evaluación, configuración de ranking, rankings
│   ├── campamentos/           - Camporees locales y de unión, plantillas, jueces, pedidos
│   ├── configuration/         - Roles, permisos, matriz, logros, notificaciones, auditoría, variables, campo local
│   ├── investiture/, certifications/, certificate-bulk-imports/, institutional-certificate-requests/
│   ├── finances/, payment-orders/, inventory/, materials/, insurance/, resources/
│   ├── reports/, section-rankings/, ranking-weights/, member-of-month/, achievements/
│   ├── requests/, enrollments/, coordination/, notifications/, rbac/, settings/, system/, year-end/
│   └── coming-soon/, v2/ (redirect), [...not-found]/
├── (printable)/reports/monthly-preview/  - Vista imprimible del informe mensual
├── api/auth/{token,refresh,logout,me}    - Cookies JWT httpOnly
├── api/annual-folders/evidence/pdf, api/evidence-review/pdf - Rutas de PDF de evidencias
├── layout.tsx                 - Root: preferencias + next-intl
└── globals.css                - Tailwind v4 + tema Scout Vibrante

src/components/   - Un directorio por dominio (catalogs, clubs, investiture, camporees…), shared/ y ui/ (shadcn)
src/lib/          - api/ (cliente por dominio), auth/, analytics/, i18n/, providers/, rbac/, por dominio
src/lib/auth/screen-catalog/ - Catálogo de pantallas y gates por rol (fuente del espejo Dart en sacdia-app)
src/navigation/sidebar/      - Ítems y filtrado de sidebar por permisos
src/stores/preferences/      - Preferencias de UI (Zustand)
src/i18n/                    - Configuración next-intl + messages.d.ts
src/server/, src/hooks/, src/config/, src/scripts/, src/styles/
src/proxy.ts                 - Protege /dashboard/* (redirige a login o refresh)
messages/                    - es, en, fr, pt-BR
```

## Stack

- **Framework**: Next.js 16.2 (App Router) + React 19
- **UI**: shadcn/ui (`components.json`: estilo `radix-maia`, `iconLibrary: hugeicons`) + Tailwind CSS v4. Fuente Geist.
- **Iconos**: Hugeicons (`@hugeicons/react`). `lucide-react` es un alias hacia `src/lib/icons/lucide-react-compat.tsx` (`tsconfig.json`, `next.config.ts`); no importar Lucide real.
- **Datos**: `@tanstack/react-query` (`src/lib/providers/query-provider.tsx`) + server actions / route handlers
- **Estado de UI**: Zustand (`src/stores/preferences`)
- **Formularios**: React Hook Form + Zod
- **i18n**: next-intl con 4 idiomas (`es` base, `en`, `fr`, `pt-BR`); locale en cookie `sacdia_admin_locale`
- **Observabilidad**: Sentry (`@sentry/nextjs`) y PostHog (`posthog-js`, `src/lib/analytics/posthog.ts`)
- **Tests**: Vitest + jsdom (`tests/msw` para mocks)

## Autenticación

Auth vía backend API y cookies httpOnly (`src/lib/auth/cookies.ts`). El admin no usa Supabase.
`src/proxy.ts` protege `/dashboard/*`: sin access token redirige a `/api/auth/refresh` (si hay refresh token) o a `/login`.
`/api/auth/token` solo entrega el JWT a llamadas same-origin.

## Authorization (screen catalog)

`src/lib/auth/screen-catalog/` define pantallas, gates y alias de rol (`screens/*.ts`, `evaluate.ts`). La app móvil tiene un espejo Dart; la paridad se verifica con `dumpAppCatalog()` (`dump.ts`) contra el fixture `test/fixtures/screen-catalog.snapshot.json` de `sacdia-app` (`screen-catalog.app.test.ts`). Al cambiar un gate `app`, regenerar el fixture y actualizar el registro Dart.

## Catálogos

- `PhaseECatalogCrudPage` (`src/components/catalogs/phase-e-catalog-crud-page.tsx`) lo usan 12 páginas de catálogo.
- Traducciones de catálogos genéricos: `TranslationsTabsField` (`src/components/forms/translations-tabs-field.tsx`, admite `secondField`) y `src/lib/generic-catalogs-i18n/{actions,helpers}.ts`.
- club-ideals usa diálogo (`src/components/catalogs/club-ideals/club-ideal-form-dialog.tsx`), no página dedicada.

## Variables de entorno

No hay archivo de ejemplo en el repo. Variables leídas por el código:

- `NEXT_PUBLIC_API_URL` (backend, ej: `http://localhost:3000`)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_RELEASE`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- `NEXT_PUBLIC_RBAC_LEGACY_FALLBACK`

## CI y deployment

- GitHub Actions en PRs hacia `development`, `preproduction` y `main`: `build.yml`, `typecheck.yml`, `tests.yml` (Node 22, pnpm 10). `notify-docs.yml` avisa a `sacdia-docs` en push a `main`.
- Deploy en Vercel (Sentry usa `VERCEL_GIT_COMMIT_SHA` como release).
- Flujo de ramas: `development` → `preproduction` (QA) → `main`.

## Documentación

- Adaptador para agentes: `AGENTS.md` (orden de lectura del workspace `sacdia`)
- Design system: `DESIGN-SYSTEM.md`
- Baseline de bundle: `PERF-BASELINE.md`
- Documentación funcional: `../docs/features/` y API en `../docs/api/`
