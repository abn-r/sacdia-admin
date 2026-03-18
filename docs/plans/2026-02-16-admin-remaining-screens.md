# Admin Remaining Screens Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar las pantallas faltantes del panel admin alineadas al `DESIGN-SYSTEM.md`, documentación padre en `../docs/` y contratos vigentes de API.

**Architecture:** Mantener App Router de Next.js con enfoque server-first para listados, acciones de mutación en server actions y componentes cliente solo donde haya interacción compleja (tablas con filtros, formularios dinámicos, matrices, asistentes). Estandarizar consumo de API en `src/lib/api/*` y alinear todos los endpoints con `../docs/02-API/ENDPOINTS-REFERENCE.md` como contrato principal operativo.

**Tech Stack:** Next.js 16 (App Router), TypeScript, shadcn/ui, TanStack Query, Axios, Sonner, date-fns, Supabase Auth.

---

I'm using the writing-plans skill to create the implementation plan.

## 1) Contexto de referencia (fuente oficial)

- Diseño UI y reglas de implementación:
  - `/Users/abner/Documents/development/sacdia/sacdia-admin/DESIGN-SYSTEM.md`
- Contrato API operativo:
  - `/Users/abner/Documents/development/sacdia/docs/02-API/ENDPOINTS-REFERENCE.md`
  - `/Users/abner/Documents/development/sacdia/docs/02-API/COMPLETE-API-REFERENCE.md`
- Alcance funcional por módulo:
  - `/Users/abner/Documents/development/sacdia/docs/01-FEATURES/*`
- Roadmap funcional/admin:
  - `/Users/abner/Documents/development/sacdia/docs/PHASE-3-ADMIN-PANEL-PLAN.md`

## 2) Diagnóstico actual (frontend)

### Ya implementado funcionalmente

- Catálogos con CRUD por páginas (`/new`, `/[id]`) para geografía y catálogos base.
  - Rutas base: `/dashboard/catalogs/*`
  - Base reusable: `src/components/catalogs/*`, `src/lib/catalogs/*`
- RBAC:
  - Permisos CRUD: `/dashboard/rbac/permissions`
  - Matriz rol-permiso: `/dashboard/rbac/matrix`

### Implementado parcial (UI placeholder o mock sin CRUD/API completo)

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/users/page.tsx`
- `src/app/dashboard/clubs/page.tsx`
- `src/app/dashboard/classes/page.tsx`
- `src/app/dashboard/honors/page.tsx`
- `src/app/dashboard/activities/page.tsx`
- `src/app/dashboard/camporees/page.tsx`
- `src/app/dashboard/finances/page.tsx`
- `src/app/dashboard/inventory/page.tsx`
- `src/app/dashboard/certifications/page.tsx`
- `src/app/dashboard/rbac/roles/page.tsx` (tarjetas estáticas)

### Rutas enlazadas en menú pero faltantes en app

- `/dashboard/approvals`
- `/dashboard/scoring`
- `/dashboard/credentials`
- `/dashboard/settings`

## 3) Hallazgos de contrato API (riesgos a resolver primero)

1. Hay diferencias entre documentos para algunos módulos (especialmente Honors).
2. En `COMPLETE-API-REFERENCE.md` están completos RBAC admin, pero varios `/api/v1/admin/*` de catálogos aparecen principalmente en `PHASE-3-ADMIN-PANEL-PLAN.md`.
3. En frontend existen wrappers que usan endpoints no confirmados por referencia principal:
   - `src/lib/api/camporees.ts` usa `/admin/camporees` (la referencia principal usa `/camporees`).
   - `src/lib/api/certifications.ts` usa `/admin/certifications` (la referencia principal usa `/certifications`).
   - `src/lib/api/inventory.ts` usa `/admin/inventory/categories` (la referencia principal usa `/catalogs/inventory-categories`).
4. Convención legacy en geografía:
   - Se observa `districlub_type_id` en catálogos (`src/lib/catalogs/entities.ts`), que debe validarse contra payload real backend.

## 4) Alcance de pantallas faltantes (MVP Admin)

### Bloque A: Operación principal (prioridad alta)

- Dashboard real (KPIs + actividad reciente)
- Usuarios + aprobaciones
- Clubes (CRUD + instancias + miembros + roles)
- Clases (catálogo + módulos + secciones + estado)
- Honores (categorías + catálogo + detalle)

### Bloque B: Operación transaccional (prioridad alta-media)

- Actividades (CRUD + asistencia)
- Camporees (CRUD + registro/gestión de miembros)
- Finanzas (movimientos + resumen + filtros)
- Inventario (items + categorías + movimientos básicos)
- Certificaciones (catálogo + seguimiento por usuario)

### Bloque C: Soporte y configuración (prioridad media)

- Notificaciones (send/broadcast/club) para admins
- Configuración (`/dashboard/settings`)
- Credenciales (`/dashboard/credentials`)

### Bloque D: Funciones avanzadas condicionadas a backend

- Gestión de Seguros (si endpoints quedan formalizados en referencia)
- Validación de Investiduras (si endpoints quedan formalizados en referencia)
- Scoring en vivo (definir contrato)

## 5) Calendario de implementación (v1)

### Semana 1 (2026-02-16 a 2026-02-20): Cierre de contratos + base común

- Congelar contrato API por módulo (documento de mapeo endpoint->pantalla).
- Corregir adapters API inconsistentes (`/admin/*` vs `/api/v1/*` vigentes).
- Crear base común para pantallas CRUD complejas:
  - tablas, filtros, paginación, formularios, estados vacío/carga/error.
- Entregable: módulo de infraestructura listo y 100% alineado a contrato.

### Semana 2 (2026-02-23 a 2026-02-27): Usuarios, Aprobaciones y Roles

- Implementar `/dashboard/users` (listado, filtros, estado, detalle básico).
- Implementar `/dashboard/approvals` (cola de aprobaciones + acciones).
- Reemplazar `rbac/roles` estático por vista API real.
- Entregable: gestión de usuarios operativa.

### Semana 3 (2026-03-02 a 2026-03-06): Clubes + Clases

- Clubes: CRUD, instancias, miembros y asignación de roles.
- Clases: listado, detalle jerárquico (módulos/secciones), gestión admin.
- Entregable: operación académica base del club.

### Semana 4 (2026-03-09 a 2026-03-13): Honores + Actividades

- Honores: categorías + catálogo + edición.
- Actividades: CRUD + asistencia por actividad.
- Entregable: operación de programa semanal.

### Semana 5 (2026-03-16 a 2026-03-20): Camporees + Finanzas

- Camporees: CRUD + registro/desregistro de miembros.
- Finanzas: movimientos, categorías, resumen mensual/anual.
- Entregable: eventos masivos y tesorería funcional.

### Semana 6 (2026-03-23 a 2026-03-27): Inventario + Certificaciones + Notificaciones

- Inventario: CRUD de ítems por club/instancia + categorías.
- Certificaciones: catálogo y flujo de seguimiento por usuario.
- Notificaciones: envío individual, broadcast y por club.
- Entregable: operación logística + comunicaciones.

### Semana 7 (2026-03-30 a 2026-04-03): Dashboard real + Settings/Credentials + hardening

- Reemplazar dashboard mock por métricas reales.
- Implementar `/dashboard/settings` y `/dashboard/credentials`.
- QA integral (responsive, permisos, regresión de navegación/submenús, estados edge).
- Entregable: Release Candidate del panel.

## 6) Plan de ejecución por tareas (orden recomendado)

### Task 1: API Contract Freeze & Endpoint Alignment

**Files:**
- Create: `docs/plans/2026-02-16-api-contract-matrix.md`
- Modify: `src/lib/api/*.ts`
- Modify: `src/lib/catalogs/entities.ts`

**Steps:**
1. Generar matriz endpoint/params/response por módulo usando referencias oficiales.
2. Ejecutar ajuste de wrappers para usar contratos vigentes.
3. Verificar manualmente con smoke calls por módulo.
4. Corregir nombres legacy incompatibles (`districlub_type_id` vs `district_id`).
5. Commit de saneamiento de contrato.

### Task 2: Shared Module Scaffolding for Remaining Screens

**Files:**
- Create: `src/components/modules/*`
- Modify: `src/components/shared/*`
- Test: `src/components/**/__tests__/*` (si se activa suite)

**Steps:**
1. Definir patrón único de listado/formulario/acciones.
2. Reusar `PageHeader`, `EmptyState`, `StatusBadge`, `AlertDialog`.
3. Implementar filtros/paginación estandarizados.
4. Validar que cumple `DESIGN-SYSTEM.md` (flujo por páginas + shadcn).
5. Commit de scaffolding reutilizable.

### Task 3: Users + Approvals Screens

**Files:**
- Create: `src/app/dashboard/approvals/page.tsx`
- Modify: `src/app/dashboard/users/page.tsx`
- Create: `src/lib/api/admin-users.ts` (o equivalente)

**Steps:**
1. Implementar listado de usuarios con búsqueda/estado/rol.
2. Implementar cola de aprobaciones y acciones.
3. Integrar guardas por rol y mensajes de error 401/403.
4. Validar flujo móvil/desktop.
5. Commit por pantalla.

### Task 4: Clubs Management

**Files:**
- Modify/Create: `src/app/dashboard/clubs/**`
- Create: `src/lib/api/clubs-admin.ts` (si aplica)

**Steps:**
1. CRUD de clubes.
2. Gestión de instancias por año eclesiástico.
3. Gestión de miembros y roles por instancia.
4. Manejo de estados de carga/empty/error.
5. Commit por subflujo.

### Task 5: Classes + Honors Admin

**Files:**
- Modify/Create: `src/app/dashboard/classes/**`
- Modify/Create: `src/app/dashboard/honors/**`
- Create/Modify: `src/lib/api/classes.ts`, `src/lib/api/honors.ts`

**Steps:**
1. Clases: catálogo + detalle jerárquico + acciones admin.
2. Honores: categorías + catálogo + edición.
3. Resolver discrepancias de contrato previo con backend.
4. Validar permisos por rol.
5. Commit por módulo.

### Task 6: Activities + Camporees

**Files:**
- Modify/Create: `src/app/dashboard/activities/**`
- Modify/Create: `src/app/dashboard/camporees/**`
- Modify: `src/lib/api/activities.ts`, `src/lib/api/camporees.ts`

**Steps:**
1. Actividades CRUD + asistencia.
2. Camporees CRUD + registro/gestión de miembros.
3. Soportar filtros por fechas, tipo y estado.
4. Validar flujos con errores de validación de negocio.
5. Commit por módulo.

### Task 7: Finances + Inventory + Certifications

**Files:**
- Modify/Create: `src/app/dashboard/finances/**`
- Modify/Create: `src/app/dashboard/inventory/**`
- Modify/Create: `src/app/dashboard/certifications/**`
- Modify: `src/lib/api/finances.ts`, `src/lib/api/inventory.ts`, `src/lib/api/certifications.ts`

**Steps:**
1. Finanzas: movimientos y resumen.
2. Inventario: items por instancia y categorías.
3. Certificaciones: catálogo y seguimiento.
4. Validar filtros, paginación y permisos.
5. Commit por módulo.

### Task 8: Notifications + Settings + Credentials + Dashboard Real

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`
- Create: `src/app/dashboard/credentials/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Create/Modify: `src/lib/api/notifications.ts`

**Steps:**
1. Implementar pantalla de notificaciones operativas admin.
2. Implementar settings/credentials base.
3. Reemplazar métricas mock del dashboard por datos reales.
4. Verificar navegación y submenús (incluyendo colapsado).
5. Commit de cierre funcional.

### Task 9: QA, i18n baseline y release

**Files:**
- Modify: `src/**/*`
- Create: `docs/plans/2026-02-16-qa-checklist-admin.md`

**Steps:**
1. QA funcional completa por módulo.
2. QA visual/responsive/estados vacíos/errores.
3. Estandarización de textos (es-ES/es-MX neutral) y preparación i18n.
4. Lint/build y checklist final.
5. Commit de release candidate.

## 7) Criterios de aceptación por sprint

- Cada pantalla expone, mínimo:
  - listado real desde API,
  - acción principal de alta/edición,
  - manejo de error visible,
  - estados loading/empty.
- No se aceptan placeholders “Pendiente” en módulos del sprint.
- Navegación y submenús sin rutas muertas.
- UI conforme a `DESIGN-SYSTEM.md`:
  - componentes shadcn,
  - CRUD por páginas,
  - textos listos para i18n.

## 8) Bloqueos esperados y mitigación

- **Bloqueo:** endpoint no documentado de forma consistente.
  - **Mitigación:** crear adapter temporal + bandera de feature + ticket de contrato.
- **Bloqueo:** discrepancias de payload en módulos legacy.
  - **Mitigación:** normalizador por módulo y pruebas de integración.
- **Bloqueo:** falta de endpoint admin para módulos avanzados.
  - **Mitigación:** entregar vista read-only y dejar mutaciones detrás de feature flag.

## 9) Resultado esperado al final del calendario

- Panel admin sin pantallas placeholder en módulos core.
- Menú consistente sin rutas rotas.
- Contrato API formalizado por pantalla.
- Flujo de operación completo para clubs, usuarios, clases, honores, actividades, camporees, finanzas, inventario, certificaciones y comunicaciones.
