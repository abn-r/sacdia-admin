# Refactorización del Panel Administrativo (Dashboard) desde Cero

Este Pull Request / Documento detalla el plan y los flujos funcionales necesarios para reescribir desde cero el panel administrativo (`sacdia-admin`). 
**Objetivo principal:** Replicar estrictamente la funcionalidad, lógica de negocio y flujos de usuario, descartando los aspectos de diseño actuales para construir una nueva interfaz.

A continuación, se describen detalladamente los flujos y reglas de negocio agrupados por módulo.

---

## 1. Flujo Principal: Resumen del Dashboard (`/dashboard`)
Esta es la pantalla de inicio al autenticarse exitosamente. Actúa como el centro neurálgico mostrando métricas en tiempo real y accesos rápidos.

### Funcionalidad requerida:
- **Métricas generales (Stats):**
  - **Usuarios registrados:** Total de usuarios en el sistema. Debe indicar cuántos están pendientes de aprobación (estado `pendiente` o `0`).
  - **Clubes activos:** Cantidad de clubes que tienen la bandera `active: true`.
  - **Camporees activos:** Eventos que se encuentran habilitados.
  - **Honores y Clases:** Conteo de honores y clases registradas en el sistema.
- **Lista de Usuarios Recientes:**
  - Obtiene y muestra los últimos 5 usuarios registrados ordenados por fecha de creación decreciente.
  - Datos a mostrar por fila: Nombre completo, Email, Rol principal, Estado (Activo/Pendiente) y Fecha de registro relativa (ej. "hace 2 días").
- **Distribución de Roles:**
  - Extraer los roles primarios de todos los usuarios y calcular el top 5 para mostrar su distribución en porcentajes.
- **Carga de Datos Segura:**
  - Todas las listas (`listClubs`, `listAdminUsers`, `listCamporees`, etc.) deben cargarse manejando posibles errores (`401, 403, 404, 429, 500`). 
  - Si un endpoint falla por permisos, no debe tronar la aplicación, sino mostrar el componente afectado como "No disponible" o "Sin acceso".

---

## 2. Gestión de Usuarios (`/dashboard/users`)
Este módulo concentra la administración del personal y su alcance (Scope).

### Flujo de Listado y Filtrado:
- **Filtros principales con Auto-Submit:**
  - **Búsqueda por texto (`q` o `search`):** Busca por nombre o correo.
  - **Filtro por Rol:** Dropdown generado dinámicamente a partir de los roles existentes.
  - **Filtro de Estado:** Activo, Inactivo o Todos.
  - **Filtro Geográfico (Unión y Campo Local):** Dropdowns interdependientes (el Campo Local depende de la Unión seleccionada).
  - **Paginación:** Selector de cantidad por página (20, 50, 100) y controles de Siguiente/Anterior.
- **Manejo de Alcance (ScopeMeta):**
  - El backend devuelve un `scope` para el administrador actual (`ALL`, `UNION`, `LOCAL_FIELD`).
  - **Regla estricta:** Si el rol es `UNION`, el dropdown de Unión se bloquea en la unión del usuario. Si es `LOCAL_FIELD`, se bloquean ambos. El frontend debe inyectar campos ocultos (`<input type="hidden">`) para forzar estos valores en la consulta.
- **Visualización de Tabla:**
  - Datos: Avatar (iniciales), Nombre y Email, Roles (como listado de etiquetas), Ubicación (País/Unión/Campo), Estado, Accesos permitidos (App / Panel), y Estado del Post-Registro (Completo/Pendiente).

### Flujo de Detalle de Usuario (`/dashboard/users/[userId]`):
- **Carga de Detalle:** Consulta al endpoint individual de usuario. Maneja explícitamente errores `404` (No encontrado) y `403` (Fuera de alcance del administrador actual).
- **Información desplegada:**
  - **Perfil:** Correo, Género, Nacimiento, Tipo de Sangre, Estado de Bautismo y fecha. Accesos del sistema.
  - **Roles y Alcance:** El scope de operaciones asignado al usuario y la lista de todos sus roles dentro del sistema. Progreso de los 4 pasos de post-registro (Foto, Datos, Club, Completo).
  - **Historial / Metadatos:**
    - Lista de **Clases** cursadas/registradas y su estado.
    - Lista de **Asignaciones a Clubes** con el nombre del club y el rol desempeñado en él.
    - Lista de **Contactos de Emergencia** (Nombre, Teléfono, Parentesco).
    - Datos del **Representante Legal** (si aplica).

---

## 3. Gestión de Clubes (`/dashboard/clubs`)
Gestión de las unidades base de los conquistadores y su estado.

### Flujo de Listado e Interacciones:
- **Verificación RBAC (Control de Acceso basado en Roles):**
  - Antes de cargar, evaluar si el usuario tiene permiso de lectura (`canReadClubs`), escritura (`canCreateClubs`) o actualización (`canUpdateClubs`).
  - Los botones de "Crear Club", "Editar" y "Eliminar" **solo** deben renderizarse o habilitarse si el usuario posee los permisos correspondientes; de lo contrario se muestra una etiqueta de "Solo lectura".
- **Filtros:**
  - Búsqueda general (`q`) aplicable localmente sobre Nombre, `club_id`, ID de campo, ID de distrito e ID de iglesia.
  - Selector de estado (Activos/Inactivos) y cantidad por página.
- **Visualización:**
  - Columnas: Nombre, Campo Local (ID), Distrito (evalúa `district_id` o `districlub_type_id`), Iglesia (ID), Estado.
- **Acciones:**
  - El flujo de eliminación y la creación de un nuevo club abren formularios/modales que interactúan directamente con la API (endpoints de mutación que no están detallados en este PR pero deben implementarse).

---

## 4. Estructura de Otros Módulos
Los flujos para los siguientes módulos siguen patrones arquitectónicos idénticos a Clubes y Usuarios:
- **/dashboard/camporees**: Listado y administración de eventos.
- **/dashboard/catalogs**: Tablas de referencia del sistema (catalogación).
- **/dashboard/classes** y **/dashboard/honors**: Gestión de la progresión y logros de los miembros.
- **/dashboard/rbac**:
  - **Permisos:** Gestión de acciones del sistema bajo el formato `recurso:accion` (ej. `clubs:read`).
  - **Roles y Permisos:** Asignación y revocación de permisos a un rol específico, mutando la matriz de autorización del backend.

---

## 5. Prevención de Errores y Edge Cases a considerar en la reescritura
Para que el funcionamiento de la nueva interfaz sea idéntico en robustez:
1. **Pérdida de Sesión (401):** Siempre que la API responda con 401, el flujo debe ofrecer la opción explícita "Ir a login" anexando un parámetro `?next=/ruta-actual` para redirigir después del inicio de sesión.
2. **Límites de Petición (429):** Informar amablemente con un "Rate limit alcanzado, reinténtalo en unos segundos" y deshabilitar los botones de acción para prevenir doble envío.
3. **Parseo Robusto:** Usar funciones seguras al leer de URLs. Por ejemplo, evitar colapsos convirtiendo siempre valores numéricos paginados o IDs mediante validaciones (ej. evitar que `limit=texto` o `page=-1` rompa las llamadas a la API fijando un valor seguro fallback).

--- 
*Fin del documento funcional. Se recomienda al desarrollador estructurar los nuevos componentes asegurando que la integración con la capa de API (`src/lib/api/*`) y Autenticación (`src/lib/auth/*`) se mantenga sin alteraciones.*
