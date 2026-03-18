# PR Plan - Rebuild del Panel Admin desde Cero (Flujos Funcionales)

## 1) Meta de este documento

Este documento define **como funciona hoy el panel admin** y **que flujos funcionales debe mantener o mejorar** en un rebuild desde cero.

Este documento **no define diseno visual** (no colores, no layout estetico, no componentes visuales).

## 2) Objetivo del PR

Entregar a un nuevo desarrollador una especificacion funcional completa para reconstruir el panel admin de SACDIA, preservando:

- Flujos de autenticacion y sesion.
- Flujos por modulo (lectura, alta, edicion, baja logica, detalle, filtros).
- Reglas de permisos y alcance.
- Contratos API actualmente consumidos.
- Manejo de errores por estado HTTP.
- Criterios de aceptacion funcional.

## 3) Estado actual del sistema (as-is)

### 3.1 Entradas principales

- Ruta raiz: `/`.
  - Comportamiento: redirige a `/dashboard`.
- Ruta login: `/login`.
- Rutas privadas: `/dashboard/*`.

### 3.2 Gate de acceso (pre-layout)

Archivo clave: `src/proxy.ts`

Comportamiento:

- Intercepta `/, /login, /dashboard/:path*`.
- Lee cookie `sacdia_admin_access_token`.
- Si la ruta inicia en `/dashboard` y no hay token:
  - Redirige a `/login`.
- Inyecta header `x-pathname` para breadcrumbs/header.

### 3.3 Gate de acceso (layout servidor)

Archivo clave: `src/app/dashboard/layout.tsx`

Comportamiento:

- Ejecuta `requireAdminUser()` antes de renderizar dashboard.
- `requireAdminUser()`:
  - Consulta `/auth/me` con token.
  - Si no hay usuario o no tiene rol admin permitido:
    - Redirige a `/api/auth/logout?next=/login`.
- Inicializa providers:
  - `AuthProvider`.
  - `QueryProvider`.
  - `SidebarProvider`.

## 4) Flujos globales de autenticacion y sesion

### 4.1 Login

Archivos clave:

- `src/app/(auth)/login/page.tsx`
- `src/lib/auth/actions.ts`

Flujo:

1. Usuario captura email + password.
2. Validacion local con Zod:
   - email valido.
   - password minimo 8 caracteres.
3. `POST /auth/login`.
4. Normalizacion de respuesta (tokens en posibles variantes de shape).
5. Validacion de rol administrativo:
   - Evalua rol en respuesta de login (si viene user).
   - Luego consulta `GET /auth/me` con access token.
   - Si no cumple rol admin/super_admin/coordinator, bloquea acceso.
6. Persistencia de cookies `httpOnly`:
   - `sacdia_admin_access_token`
   - `sacdia_admin_refresh_token` (si existe).
7. Redirect final a `/dashboard`.

Mensajes funcionales importantes:

- Credenciales invalidas: 400/401.
- Endpoint no encontrado: 404.
- Rol no permitido.
- Sesion incompleta al fallar `/auth/me`.
- Mensajes especificos para cuentas sin rol, inactivas, no confirmadas, registro incompleto.

### 4.2 Obtener usuario actual

Archivo clave: `src/lib/auth/session.ts`

Flujo:

- Lee access token desde cookie.
- Si no existe: retorna null.
- Llama `GET /auth/me`.
- Si backend responde 401/403:
  - borra cookies.
  - retorna null.
- Si backend responde 429 o 5xx:
  - retorna null (degradacion segura).

### 4.3 Logout

Archivos clave:

- `src/app/api/auth/logout/route.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/actions.ts`

Flujo:

1. Si hay refresh token, intenta `POST /auth/logout`.
2. Independientemente del resultado, limpia cookies locales.
3. Redirige a `/login` (o `next` seguro que inicie con `/`).

## 5) Navegacion funcional actual

Archivo clave: `src/components/layout/nav-items.ts`

### 5.1 Secciones

- Dashboard
- Usuarios
- Catalogos
  - Resumen catalogos
  - Paises
  - Uniones
  - Campos locales
  - Distritos
  - Iglesias
  - Tipos de relacion
  - Alergias
  - Enfermedades
  - Anios eclesiasticos
  - Tipos de club
  - Ideales de club
- Clubes
- Academico
  - Camporee
  - Clases
  - Honores
- Sistema
  - RBAC (matriz, roles, permisos)

## 6) Patrones funcionales transversales del panel

### 6.1 Patron de listados

Patron recurrente:

- Paginas server-side con `searchParams`.
- Carga de dataset desde API.
- Filtros en querystring.
- Paginacion en frontend sobre arreglo filtrado.
- Vista desktop (tabla) + mobile (cards).

### 6.2 Patron de mutaciones

Patron recurrente:

- Server Actions (`"use server"`).
- Parseo/formateo de `FormData`.
- Llamada API `POST/PATCH/DELETE`.
- `revalidatePath(...)`.
- `redirect(...)` o estado `success/error`.

### 6.3 Patron de manejo de endpoint no disponible

Patron recurrente:

- Si API responde 401/403/404/405/429/5xx:
  - marca endpoint como no disponible.
  - renderiza badge de estado (`Sin acceso`, `No publicado`, `Rate limitado`).
  - renderiza EmptyState o mensaje de degradacion.

### 6.4 Patron de alcance (scope)

Relevante en usuarios:

- Backend puede devolver `meta.scope` con tipo:
  - `ALL`
  - `UNION`
  - `LOCAL_FIELD`
- Si el scope viene bloqueado:
  - filtros de union/campo local quedan fijados.
  - UI solo permite reducir resultados dentro del alcance.

## 7) Contrato tecnico API actual (wrappers)

### 7.1 Auth

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`

### 7.2 Usuarios admin

- `GET /admin/users`
- `GET /admin/users/:userId`
- `PATCH /admin/users/:userId/approval` (intento 1)
- `PATCH /admin/users/:userId` (fallback intento 2)

### 7.3 Clubes

- `GET /clubs`
- `GET /clubs/:clubId`
- `POST /clubs`
- `PATCH /clubs/:clubId`
- `DELETE /clubs/:clubId`
- `GET /clubs/:clubId/instances`
- `POST /clubs/:clubId/instances`
- `PATCH /clubs/:clubId/instances/:instanceType/:instanceId`
- `GET /clubs/:clubId/instances/:instanceType/:instanceId/members`
- `POST /clubs/:clubId/instances/:instanceType/:instanceId/members`
- `PATCH /clubs/:clubId/instances/:instanceType/:instanceId/members/:userId/role`
- `DELETE /clubs/:clubId/instances/:instanceType/:instanceId/members/:userId`

### 7.4 Camporees

- `GET /camporees`
- `GET /camporees/:camporeeId`
- `POST /camporees`
- `PATCH /camporees/:camporeeId`
- `DELETE /camporees/:camporeeId`
- `GET /camporees/:camporeeId/members`
- `POST /camporees/:camporeeId/register`
- `DELETE /camporees/:camporeeId/members/:userId`

### 7.5 Clases

- `GET /classes`
- `GET /classes/:classId`
- `GET /classes/:classId/modules`

### 7.6 Honores

- `GET /honors`
- `GET /honors/:honorId`
- `GET /honors/categories`

### 7.7 Catalogos

Base dinamica por `EntityConfig`:

- Lectura general via `listEndpoint`.
- Mutacion via `adminEndpoint` (si `allowMutations !== false`).

Entidades activas:

- countries
- unions
- local-fields
- districts
- churches
- relationship-types
- allergies
- diseases
- ecclesiastical-years
- club-types (solo lectura)
- club-ideals (solo lectura)

### 7.8 RBAC

- `GET /admin/rbac/permissions`
- `GET /admin/rbac/permissions/:id`
- `POST /admin/rbac/permissions`
- `PATCH /admin/rbac/permissions/:id`
- `DELETE /admin/rbac/permissions/:id`
- `GET /admin/rbac/roles`
- `GET /admin/rbac/roles/:id`
- `PUT /admin/rbac/roles/:id/permissions`
- `DELETE /admin/rbac/roles/:id/permissions/:permissionId`

## 8) Matriz de modulos y flujos funcionales

## 8.1 Dashboard (`/dashboard`)

Objetivo:

- Resumen operativo rapido.

Entradas API:

- Usuarios admin.
- Clubes.
- Camporees.
- Clases.
- Honores.

Flujos:

1. Cargar metricas base:
   - total usuarios.
   - pendientes aprobacion.
   - clubes activos.
   - camporees activos.
   - total honores y clases.
2. Tabla de usuarios recientes.
3. Distribucion de roles (top 5).
4. Quick links funcionales a modulos principales.

Fallback:

- Si endpoint de modulo falla (safe list), dashboard continua con datos parciales.

## 8.2 Usuarios (`/dashboard/users`)

Objetivo:

- Consultar usuarios administrativos con filtros, alcance y detalle.

Flujos:

1. Carga listado paginado desde `/admin/users`.
2. Filtros:
   - texto (`search`).
   - rol.
   - activo/inactivo.
   - union.
   - campo local.
   - limite por pagina.
3. Si scope backend restringe union/campo:
   - bloqueo de select.
   - hidden input forzado.
4. Render desktop/mobile.
5. Navegar a detalle por `user_id`.

Endpoint state:

- `available`.
- `forbidden`.
- `missing`.
- `rate-limited`.

Mensajeria funcional:

- Dialogo "Alcance" explica visibilidad real segun scope.

## 8.3 Usuario detalle (`/dashboard/users/:userId`)

Objetivo:

- Ver ficha completa del usuario.

Flujos:

1. `GET /admin/users/:userId`.
2. Render bloques:
   - perfil personal.
   - geografia y roles.
   - post-registro.
   - clases.
   - asignaciones de club.
   - contactos de emergencia.
   - representante legal.
3. Manejo explicito por status:
   - 401: sesion expirada.
   - 403: sin alcance.
   - 404: no encontrado/fuera de alcance.
   - 429: rate limit.
   - 5xx: servicio no disponible.

## 8.4 Catalogos - resumen (`/dashboard/catalogs`)

Objetivo:

- Entrada central a catalogos.

Flujos:

- Navegacion hacia cada catalogo especifico.

## 8.5 Catalogos - CRUD generico

Objetivo:

- Proveer CRUD por entidad con configuracion declarativa.

Componentes base:

- `CatalogListPage`
- `CatalogNewPage`
- `CatalogEditPage`
- `CatalogForm`
- `CatalogDeleteAction`

Flujos por entidad:

1. Listado:
   - carga por `listEndpoint`.
   - filtro texto + activo + parentFilter (si aplica).
   - paginacion.
2. Alta:
   - parse form segun `fields`.
   - `POST adminEndpoint`.
3. Edicion:
   - `GET by id` (o fallback buscando en lista).
   - `PATCH adminEndpoint/:id`.
4. Baja logica:
   - `DELETE adminEndpoint/:id`.
5. Reglas:
   - si `allowMutations=false`, solo lectura.

## 8.6 Clubes listado (`/dashboard/clubs`)

Objetivo:

- Gestion de clubes base.

Flujos:

1. Validar permisos lectura/creacion/actualizacion.
2. Cargar lista `/clubs`.
3. Filtros:
   - busqueda.
   - estado.
   - perPage.
4. Acciones:
   - nuevo club.
   - editar club.
   - desactivar club.

Permisos UI:

- Sin permiso update: solo lectura.

## 8.7 Nuevo club (`/dashboard/clubs/new`)

Objetivo:

- Crear club + instancias iniciales en un solo flujo.

Flujos:

1. Verificar permiso create.
2. Cargar tipos de club (si endpoint disponible).
3. Wizard:
   - Paso A: datos base club.
   - Paso B: activar instancias iniciales (adventurers/pathfinders/master_guilds).
   - Paso C: submit.
4. Server action `createClubWithInstancesAction`:
   - crea club.
   - intenta crear instancias activadas.
   - acumula resultado por instancia.
   - si falla alguna instancia:
     - no revierte club.
     - muestra estado y permite continuar al detalle para reintentos.

## 8.8 Club detalle (`/dashboard/clubs/:id`)

Objetivo:

- Editar datos base y sincronizar instancias.

Flujos:

1. Cargar club por id.
2. Cargar instancias (si permiso lectura instancias).
3. Cargar club types y catalogos geograficos para selects (si disponibles).
4. Form editar club:
   - nombre/descripcion.
   - geografia.
   - direccion/coordenadas.
   - activo.
5. Form sincronizar instancias:
   - habilitar/deshabilitar por tipo.
   - actualizar nombre y clubTypeId.
   - submit unico para sync.
6. Lista de instancias con link a gestion por instancia.

## 8.9 Instancia de club (`/dashboard/clubs/:id/instances/:type/:instanceId`)

Objetivo:

- Gestion fina de una instancia.

Flujos:

1. Validar club y instancia.
2. Cargar miembros de instancia.
3. Cargar anios eclesiasticos para alta de miembro.
4. Actualizar instancia:
   - nombre.
   - tipo club.
   - estado.
5. Alta miembro:
   - user_id.
   - role_id.
   - ecclesiastical_year_id.
6. Cambio de rol de miembro.
7. Remover miembro.

## 8.10 Camporees listado (`/dashboard/camporees`)

Objetivo:

- Gestion de eventos camporee.

Flujos:

1. Cargar `/camporees`.
2. Filtros:
   - texto.
   - estado.
   - tipo (local/union).
   - perPage.
3. Acciones:
   - crear camporee.
   - editar camporee.
   - desactivar camporee.

## 8.11 Nuevo camporee (`/dashboard/camporees/new`)

Objetivo:

- Alta de camporee.

Flujo:

- Form con datos base.
- `createCamporeeAction`.
- redirect a listado.

## 8.12 Camporee detalle (`/dashboard/camporees/:id`)

Objetivo:

- Editar camporee y gestionar miembros.

Flujos:

1. Cargar camporee por id.
2. Editar campos base.
3. Cargar miembros registrados.
4. Registrar miembro:
   - user_id.
   - camporee_type.
   - club_name opcional.
   - insurance_id opcional.
5. Remover miembro.

## 8.13 Clases listado (`/dashboard/classes`)

Objetivo:

- Consulta de catalogo de clases.

Flujos:

1. Cargar `/classes`.
2. Filtros:
   - texto.
   - estado.
   - tipo club.
   - perPage.
3. Navegacion a detalle de clase.

## 8.14 Clase detalle (`/dashboard/classes/:id`)

Objetivo:

- Consultar estructura de modulos/secciones.

Flujos:

1. Cargar clase por id.
2. Cargar modulos por endpoint dedicado.
3. Fusionar modulos de ambos payloads.
4. Mostrar:
   - metadata clase.
   - tabla de modulos.
   - detalle de secciones por modulo.

## 8.15 Honores listado (`/dashboard/honors`)

Objetivo:

- Consulta avanzada de honores.

Flujos:

1. Cargar honores.
2. Cargar categorias.
3. Filtros:
   - texto.
   - estado.
   - categoria.
   - tipo club.
   - skill level.
   - perPage.
4. Mostrar tarjetas resumen por categoria (top).
5. Navegar a detalle.

## 8.16 Honor detalle (`/dashboard/honors/:id`)

Objetivo:

- Consultar metadata de honor.

Flujos:

1. Cargar honor por id.
2. Cargar categorias para resolver nombre.
3. Mostrar:
   - categoria.
   - estado.
   - tipo club.
   - nivel.
   - cantidad requisitos.
   - recurso de parche.
   - descripcion.
4. Aviso de que progreso de requisitos vive en flujo por usuario.

## 8.17 RBAC index (`/dashboard/rbac`)

Objetivo:

- Entrada a gestion de permisos y matriz.

Flujos:

- Navegacion a:
  - permisos.
  - roles/matriz.

## 8.18 RBAC permisos (`/dashboard/rbac/permissions`)

Objetivo:

- CRUD de permisos del sistema.

Flujos:

1. Listar permisos.
2. Crear permiso.
3. Editar permiso.
4. Desactivar permiso.

Validacion:

- Formato obligatorio `resource:action` en minusculas.

## 8.19 RBAC roles (`/dashboard/rbac/roles`)

Objetivo:

- Ver catalogo de roles y conteo de permisos.

Flujos:

- Listado de roles.
- Link a matriz de seguridad.

## 8.20 RBAC matriz (`/dashboard/rbac/matrix`)

Objetivo:

- Asignar permisos por rol.

Flujos:

1. Cargar roles + permisos.
2. Seleccionar rol.
3. Filtrar permisos por texto.
4. Toggle por celda (recurso x accion).
5. Guardar cambios (sync full):
   - `PUT /admin/rbac/roles/:roleId/permissions`.

## 9) Reglas de autorizacion y permisos (as-is)

### 9.1 Roles globales admin validos

- `super_admin`
- `admin`
- `coordinator`

### 9.2 Resolucion de roles/permisos

- Roles y permisos pueden venir en distintos shapes de backend.
- El sistema actual normaliza multiples variantes:
  - `roles[]`
  - `users_roles[].roles.role_name`
  - `permissions[]`
  - estructuras anidadas.

### 9.3 Gating por modulo

- Global dashboard: requiere rol admin permitido.
- Clubes/instancias: aplican checks granulares de permiso en UI.
- Otros modulos: mayormente dependen de validacion backend + manejo de errores.

## 10) Manejo funcional de errores (reglas que deben mantenerse)

### 10.1 Errores comunes de acciones

Archivo base: `src/lib/api/action-error.ts`

Mapeo funcional:

- 401/403 -> "No tienes permisos".
- 404/405 -> "Endpoint no disponible".
- 409 -> conflicto de datos.
- 422 -> datos invalidos.
- 429 -> demasiadas solicitudes.
- 5xx -> backend no disponible.

### 10.2 Errores en listados/detalles

Patron:

- detectar estado recuperable.
- mostrar mensaje funcional especifico.
- no romper la navegacion principal.

## 11) Alcance del rebuild desde cero

### 11.1 In scope obligatorio

- Todos los flujos documentados en seccion 8.
- Contratos API de seccion 7 (o versionados si se acuerda cambio).
- Reglas de sesion/autorizacion de seccion 3, 4 y 9.
- Manejo de errores de seccion 10.

### 11.2 Out of scope explicito

- Reglas de diseno visual.
- Rebranding grafico.
- Decisiones de UI estetica.

## 12) Plan funcional recomendado para el nuevo desarrollador

### Fase 1 - Fundacion

1. Implementar capa API unificada (`apiRequest`, `ApiError`, unwrap helpers).
2. Implementar auth cookies + login/logout + getCurrentUser.
3. Implementar gate de acceso de dashboard.

### Fase 2 - Shell del panel

1. Layout dashboard server-side.
2. Sidebar + header + breadcrumb + providers.
3. Pattern base de listados/empty/error.

### Fase 3 - Modulos core

1. Usuarios + detalle.
2. Catalogos dinamicos.
3. Clubes + wizard + detalle + instancias + miembros.

### Fase 4 - Modulos academicos

1. Camporees.
2. Clases.
3. Honores.

### Fase 5 - Seguridad interna

1. RBAC permisos CRUD.
2. RBAC roles.
3. Matriz de seguridad con sync.

## 13) Checklist de aceptacion funcional

## 13.1 Auth y sesion

- [ ] Sin token no se puede entrar a `/dashboard/*`.
- [ ] Login exitoso setea cookies y redirige a dashboard.
- [ ] Usuario sin rol admin no accede al panel.
- [ ] Logout limpia sesion local aunque backend falle.

## 13.2 Usuarios

- [ ] Filtros aplican correctamente sobre endpoint.
- [ ] Scope backend restringe filtros bloqueados (union/campo local).
- [ ] Detalle maneja 401/403/404/429/5xx con estados correctos.

## 13.3 Catalogos

- [ ] Entidades mutables permiten create/update/delete.
- [ ] Entidades readonly no muestran acciones de mutacion.
- [ ] Parent filters funcionan (country->union->local field->district->church).

## 13.4 Clubes

- [ ] Crear club sin instancias funciona.
- [ ] Crear club con instancias parciales reporta fallos por instancia sin perder club.
- [ ] Sync de instancias respeta enable/disable por tipo.
- [ ] Gestion de miembros de instancia (alta/cambio rol/remocion) operativa.

## 13.5 Camporees

- [ ] Listado y filtros operativos.
- [ ] Alta y edicion operativas.
- [ ] Registro y remocion de miembros operativa.

## 13.6 Clases y honores

- [ ] Listados y filtros operativos.
- [ ] Detalles cargan metadata completa.
- [ ] Degradacion correcta cuando endpoints secundarios fallan.

## 13.7 RBAC

- [ ] CRUD de permisos operativos con validacion `resource:action`.
- [ ] Matriz guarda asignaciones via sync total.
- [ ] Conteos y estados de roles/permissions consistentes.

## 14) Riesgos funcionales a vigilar en el rebuild

1. Diferencias de shape en respuestas de backend.
2. Scope de usuarios y bloqueos de filtros mal aplicados.
3. Permisos de clubes/instancias inconsistentes entre UI y backend.
4. Manejo de degradacion incompleto en 429/5xx.
5. Mutaciones parcialmente exitosas sin feedback por subflujo (especialmente instancias).

## 15) Bloque listo para descripcion de PR (copy/paste)

### Titulo sugerido

`docs: functional rebuild blueprint for admin panel (no UI design scope)`

### Descripcion sugerida

Este PR agrega una especificacion funcional completa para rehacer el panel admin desde cero, orientada a handoff para un nuevo desarrollador.

Incluye:

- Flujos globales de autenticacion, sesion y acceso.
- Mapa funcional de navegacion y modulos activos.
- Flujos detallados por pantalla (listado, detalle, mutaciones, filtros, estados).
- Contrato API consumido actualmente por cada modulo.
- Reglas de permisos/alcance y degradacion por errores HTTP.
- Checklist de aceptacion funcional para validar parity en el rebuild.

Fuera de alcance:

- No se incluyen decisiones de diseno visual.
- No se define propuesta de UI/branding.

## 16) Referencias del codigo actual auditado

- Auth/session:
  - `src/proxy.ts`
  - `src/lib/auth/actions.ts`
  - `src/lib/auth/session.ts`
- Layout/nav:
  - `src/app/dashboard/layout.tsx`
  - `src/components/layout/nav-items.ts`
- Usuarios:
  - `src/app/dashboard/users/page.tsx`
  - `src/app/dashboard/users/[userId]/page.tsx`
  - `src/lib/api/admin-users.ts`
- Catalogos:
  - `src/lib/catalogs/entities.ts`
  - `src/lib/catalogs/service.ts`
  - `src/components/catalogs/*`
- Clubes:
  - `src/app/dashboard/clubs/*`
  - `src/lib/api/clubs.ts`
  - `src/lib/clubs/actions.ts`
- Camporees:
  - `src/app/dashboard/camporees/*`
  - `src/lib/api/camporees.ts`
  - `src/lib/camporees/actions.ts`
- Clases y honores:
  - `src/app/dashboard/classes/*`
  - `src/app/dashboard/honors/*`
  - `src/lib/api/classes.ts`
  - `src/lib/api/honors.ts`
- RBAC:
  - `src/app/dashboard/rbac/*`
  - `src/lib/rbac/service.ts`
  - `src/lib/rbac/actions.ts`
  - `src/components/rbac/*`

