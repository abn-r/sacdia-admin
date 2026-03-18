# API Contract Matrix - Admin Panel

**Fecha:** 2026-02-16  
**Fuente principal:** `../docs/02-API/ENDPOINTS-REFERENCE.md`  
**Fuente secundaria de detalle:** `../docs/02-API/COMPLETE-API-REFERENCE.md`

## Objetivo

Congelar el contrato de endpoints que el panel admin debe consumir antes de seguir con implementación de pantallas.

## Matriz por módulo

| Módulo | Listado / lectura | Mutaciones documentadas | Estado de contrato | Adapter frontend |
|---|---|---|---|---|
| Geografía admin | `/admin/countries`, `/admin/unions`, `/admin/local-fields`, `/admin/districts`, `/admin/churches` | `POST/PATCH/DELETE` por entidad (según `PHASE-3-ADMIN-PANEL-PLAN.md`) | Parcial (referencia principal no lista todos los `/admin/*`) | `src/lib/catalogs/*` |
| Catálogos admin (relationship-types, allergies, diseases, ecclesiastical-years) | `/admin/...` | `POST/PATCH/DELETE` por entidad (según `PHASE-3-ADMIN-PANEL-PLAN.md`) | Parcial | `src/lib/catalogs/*` |
| Club types | `/catalogs/club-types` | No documentadas en referencia principal | Solo lectura | `src/lib/catalogs/entities.ts` |
| Club ideals | `/catalogs/club-ideals` | No documentadas en referencia principal | Solo lectura | `src/lib/catalogs/entities.ts` |
| RBAC admin | `/admin/rbac/permissions`, `/admin/rbac/roles` | CRUD permisos + sync rol/permisos | Confirmado | `src/lib/rbac/*` |
| Clubs | `/clubs`, `/clubs/:clubId`, `/clubs/:clubId/instances` | `POST/PATCH/DELETE /clubs...`, `POST/PATCH` instancias, roles de club | Confirmado | `src/lib/api/clubs.ts` |
| Classes | `/classes`, `/classes/:classId`, `/classes/:classId/modules` | Flujo de usuario para progreso (`/users/:userId/classes...`) | Confirmado | `src/lib/api/classes.ts` |
| Honors | `/honors`, `/honors/:honorId`, `/honors/categories` | Flujo de usuario (`/users/:userId/honors...`) | Confirmado con diferencias históricas en docs legacy | `src/lib/api/honors.ts` |
| Activities | `/clubs/:clubId/activities`, `/activities/:activityId` | `POST/PATCH/DELETE` + asistencia | Confirmado | `src/lib/api/activities.ts` |
| Camporees | `/camporees`, `/camporees/:id`, `/camporees/:id/members` | `POST/PATCH/DELETE`, registro de miembros | Confirmado | `src/lib/api/camporees.ts` |
| Finances | `/finances/categories`, `/clubs/:clubId/finances`, `/clubs/:clubId/finances/summary` | `POST /clubs/:clubId/finances`, `PATCH/DELETE /finances/:id` | Confirmado | `src/lib/api/finances.ts` |
| Inventory | `/catalogs/inventory-categories`, `/clubs/:clubId/inventory` | `POST /clubs/:clubId/inventory`, `PATCH/DELETE /inventory/:id` | Confirmado | `src/lib/api/inventory.ts` |
| Certifications | `/certifications`, `/certifications/:id` | Flujo de usuario (`/users/:userId/certifications...`) | Confirmado | `src/lib/api/certifications.ts` |
| Notifications | `/notifications/send`, `/notifications/broadcast`, `/notifications/club/:type/:id`, `/fcm-tokens` | `POST/DELETE` según endpoint | Confirmado | pendiente (`src/lib/api/notifications.ts`) |

## Ajustes aplicados en esta fase

- `src/lib/api/camporees.ts`: cambiado de `/admin/camporees` a `/camporees`.
- `src/lib/api/certifications.ts`: cambiado de `/admin/certifications` a `/certifications`.
- `src/lib/api/inventory.ts`: cambiado de `/admin/inventory/categories` a `/catalogs/inventory-categories`.
- `src/lib/catalogs/entities.ts`: `districts.idField` normalizado a `district_id`.
- `src/lib/catalogs/entities.ts`: `club-types` y `club-ideals` marcados como solo lectura (`allowMutations: false`) por contrato oficial actual.

## Decisiones para implementación posterior

1. Cualquier pantalla nueva debe derivar endpoints de esta matriz.
2. Si aparece discrepancia entre docs, priorizar `ENDPOINTS-REFERENCE.md` y registrar excepción en este archivo.
3. No habilitar botones de crear/editar/eliminar en entidades sin mutaciones documentadas.
