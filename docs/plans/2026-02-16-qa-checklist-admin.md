# QA Checklist Admin - Release Candidate

**Fecha de actualizacion**: 2026-02-17  
**Ambiente**: local (`sacdia-admin`)  
**Objetivo**: validar cierre funcional de pantallas admin implementadas contra contrato API vigente.

## 1) Cobertura funcional por modulo

| Modulo | Listado API | Alta/Edicion | Estados empty/error | Observaciones |
| --- | --- | --- | --- | --- |
| Dashboard | OK | N/A | OK | KPIs con endpoints reales + cobertura de endpoints |
| Usuarios | OK | OK (aprobaciones) | OK | Endpoint admin tolerante a 401/404/429 |
| Aprobaciones | OK | OK | OK | Acciones approve/reject con revalidacion |
| Clubes | OK | OK | OK | Incluye detalle e instancias |
| Clases | OK | OK | OK | Listado + detalle por id |
| Honores | OK | OK | OK | Filtros + detalle |
| Actividades | OK | OK | OK | Alta, detalle y filtros por club |
| Camporees | OK | OK | OK | Alta, detalle y acciones base |
| Finanzas | OK | OK | OK | Resumen, filtros, paginacion |
| Inventario | OK | OK | OK | Categorias, filtros, paginacion |
| Certificaciones | OK | OK | OK | Listado + detalle |
| Notificaciones | OK | OK | OK | Centro FCM + envio directo/broadcast/club |
| Credenciales | OK | OK | OK | OAuth + reset password con estado endpoint |
| Configuracion | OK | N/A | OK | Salud de modulos + preferencias locales |
| Catalogos | OK | OK | OK | CRUD por paginas |
| RBAC | OK | OK | OK | Matriz, roles, permisos |
| Scoring | Parcial | N/A | OK | Modo readiness mientras se publica contrato leaderboard |

## 2) QA visual y navegacion

- Sidebar con submenu de catalogos y rutas CRUD agrupadas.
- Navegacion desktop/mobile validada para rutas de dashboard principales.
- Estados vacios visibles en listados y modulos de soporte.
- Mensajes de endpoint degradado visibles para 401/404/429/5xx en modulos criticos.

## 3) Baseline i18n

- Preferencia de idioma persistida en `localStorage` y cookie `sacdia_admin_locale`.
- `Dashboard` usa locale preferido para fechas relativas (`es-MX`/`es-ES`/`en-US`).
- Base preparada para ampliar diccionarios por modulo sin romper server-render.

## 4) Verificacion tecnica ejecutada

- `pnpm exec tsc --noEmit` -> OK
- `pnpm lint` -> OK
- `pnpm build` -> OK
- Smoke E2E runner agregado: `pnpm test:e2e:smoke` (requiere `E2E_ADMIN_EMAIL` + `E2E_ADMIN_PASSWORD`)
- Smoke responsive agregado (desktop/mobile user-agent) en rutas clave de login/dashboard.
- Smoke CRUD por API agregado para `admin/users` (opcional), `clubs`, `finances`, `inventory` en modo escritura.

## 5) Pendientes de hardening (post-RC)

1. Regression visual full con snapshots en navegador real (Playwright) para desktop y mobile.
2. Validar payload final de scoring cuando backend publique contrato definitivo.
3. Integrar i18n por diccionarios en todos los modulos (baseline ya aplicado en login).

## 6) Ejecucion de smoke E2E

- Solo lectura:
  - `E2E_SKIP_AUTH=1 pnpm test:e2e:smoke`
- Lectura autenticada:
  - `set -a; source .env.e2e.local; set +a; pnpm test:e2e:smoke`
- Con escritura CRUD (create/edit + cleanup):
  - `set -a; source .env.e2e.local; set +a; E2E_ENABLE_WRITE=1 pnpm test:e2e:smoke`

## 7) Handoff UAT

- Estado: listo para UAT funcional con backend local/QA.
- Alcance UAT sugerido:
  1. Login: alternar tema claro/oscuro, mostrar/ocultar contrasena, validar guardado de credenciales del navegador.
  2. CRUD principales: clubes, finanzas e inventario.
  3. Flujos de aprobaciones y permisos de usuario admin.
