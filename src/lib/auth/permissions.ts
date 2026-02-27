// ═══════════════════════════════════════════════════════════════════════════
// Constantes de permisos del sistema SACDIA
// ═══════════════════════════════════════════════════════════════════════════
// Este archivo es solo para AUTOCOMPLETADO y type-safety.
// La fuente de verdad es la tabla `permissions` en la base de datos.
//
// Para agregar un nuevo permiso:
//   1. Crear el permiso en la tabla `permissions` de la DB
//   2. Asignarlo al rol correspondiente en `role_permissions`
//   3. Agregar la constante aquí en el grupo correspondiente
//
// Si un permiso existe en DB pero NO aquí, el sistema sigue funcionando.
// Este archivo solo facilita el autocompletado en el IDE.
// ═══════════════════════════════════════════════════════════════════════════

// --- Gestión de Usuarios ---
export const USERS_READ = "users:read";
export const USERS_READ_DETAIL = "users:read_detail";
export const USERS_CREATE = "users:create";
export const USERS_UPDATE = "users:update";
export const USERS_DELETE = "users:delete";
export const USERS_EXPORT = "users:export";

// --- Roles y Permisos ---
export const ROLES_READ = "roles:read";
export const ROLES_CREATE = "roles:create";
export const ROLES_UPDATE = "roles:update";
export const ROLES_DELETE = "roles:delete";
export const ROLES_ASSIGN = "roles:assign";
export const PERMISSIONS_READ = "permissions:read";
export const PERMISSIONS_ASSIGN = "permissions:assign";

// --- Clubes ---
export const CLUBS_READ = "clubs:read";
export const CLUBS_CREATE = "clubs:create";
export const CLUBS_UPDATE = "clubs:update";
export const CLUBS_DELETE = "clubs:delete";
// Canonical naming for club instances (new RBAC plan)
export const CLUBS_INSTANCES_READ = "clubs_instances:read";
export const CLUBS_INSTANCES_CREATE = "clubs_instances:create";
export const CLUBS_INSTANCES_UPDATE = "clubs_instances:update";
export const CLUBS_INSTANCES_DELETE = "clubs_instances:delete";
// Legacy aliases kept for backward compatibility during migration.
export const CLUB_INSTANCES_READ = "club_instances:read";
export const CLUB_INSTANCES_CREATE = "club_instances:create";
export const CLUB_INSTANCES_UPDATE = "club_instances:update";
export const CLUB_INSTANCES_DELETE = "club_instances:delete";
export const CLUB_ROLES_READ = "club_roles:read";
export const CLUB_ROLES_ASSIGN = "club_roles:assign";
export const CLUB_ROLES_REVOKE = "club_roles:revoke";

// --- Jerarquía Geográfica ---
export const COUNTRIES_READ = "countries:read";
export const COUNTRIES_CREATE = "countries:create";
export const COUNTRIES_UPDATE = "countries:update";
export const COUNTRIES_DELETE = "countries:delete";
export const UNIONS_READ = "unions:read";
export const UNIONS_CREATE = "unions:create";
export const UNIONS_UPDATE = "unions:update";
export const UNIONS_DELETE = "unions:delete";
export const LOCAL_FIELDS_READ = "local_fields:read";
export const LOCAL_FIELDS_CREATE = "local_fields:create";
export const LOCAL_FIELDS_UPDATE = "local_fields:update";
export const LOCAL_FIELDS_DELETE = "local_fields:delete";
export const CHURCHES_READ = "churches:read";
export const CHURCHES_CREATE = "churches:create";
export const CHURCHES_UPDATE = "churches:update";
export const CHURCHES_DELETE = "churches:delete";

// --- Catálogos de Referencia ---
export const CATALOGS_READ = "catalogs:read";
export const CATALOGS_CREATE = "catalogs:create";
export const CATALOGS_UPDATE = "catalogs:update";
export const CATALOGS_DELETE = "catalogs:delete";

// --- Clases y Honores ---
export const CLASSES_READ = "classes:read";
export const CLASSES_CREATE = "classes:create";
export const CLASSES_UPDATE = "classes:update";
export const CLASSES_DELETE = "classes:delete";
export const HONORS_READ = "honors:read";
export const HONORS_CREATE = "honors:create";
export const HONORS_UPDATE = "honors:update";
export const HONORS_DELETE = "honors:delete";
export const HONOR_CATEGORIES_READ = "honor_categories:read";
export const HONOR_CATEGORIES_CREATE = "honor_categories:create";
export const HONOR_CATEGORIES_UPDATE = "honor_categories:update";
export const HONOR_CATEGORIES_DELETE = "honor_categories:delete";

// --- Actividades ---
export const ACTIVITIES_READ = "activities:read";
export const ACTIVITIES_CREATE = "activities:create";
export const ACTIVITIES_UPDATE = "activities:update";
export const ACTIVITIES_DELETE = "activities:delete";
export const ATTENDANCE_READ = "attendance:read";
export const ATTENDANCE_MANAGE = "attendance:manage";

// --- Finanzas ---
export const FINANCES_READ = "finances:read";
export const FINANCES_CREATE = "finances:create";
export const FINANCES_UPDATE = "finances:update";
export const FINANCES_DELETE = "finances:delete";
export const FINANCES_EXPORT = "finances:export";

// --- Inventario ---
export const INVENTORY_READ = "inventory:read";
export const INVENTORY_CREATE = "inventory:create";
export const INVENTORY_UPDATE = "inventory:update";
export const INVENTORY_DELETE = "inventory:delete";

// --- Reportes y Dashboard ---
export const REPORTS_VIEW = "reports:view";
export const REPORTS_EXPORT = "reports:export";
export const DASHBOARD_VIEW = "dashboard:view";

// --- Sistema ---
export const SETTINGS_READ = "settings:read";
export const SETTINGS_UPDATE = "settings:update";
export const ECCLESIASTICAL_YEARS_READ = "ecclesiastical_years:read";
export const ECCLESIASTICAL_YEARS_CREATE = "ecclesiastical_years:create";
export const ECCLESIASTICAL_YEARS_UPDATE = "ecclesiastical_years:update";

// ═══════════════════════════════════════════════════════════════════════════
// Agrupación por módulo (útil para UI de asignación de permisos)
// ═══════════════════════════════════════════════════════════════════════════
export const PERMISSION_GROUPS = {
  users: {
    label: "Usuarios",
    permissions: [
      { key: USERS_READ, label: "Ver listado" },
      { key: USERS_READ_DETAIL, label: "Ver detalle" },
      { key: USERS_CREATE, label: "Crear" },
      { key: USERS_UPDATE, label: "Editar" },
      { key: USERS_DELETE, label: "Eliminar" },
      { key: USERS_EXPORT, label: "Exportar" },
    ],
  },
  roles: {
    label: "Roles y Permisos",
    permissions: [
      { key: ROLES_READ, label: "Ver roles" },
      { key: ROLES_CREATE, label: "Crear rol" },
      { key: ROLES_UPDATE, label: "Editar rol" },
      { key: ROLES_DELETE, label: "Eliminar rol" },
      { key: ROLES_ASSIGN, label: "Asignar roles" },
      { key: PERMISSIONS_READ, label: "Ver permisos" },
      { key: PERMISSIONS_ASSIGN, label: "Asignar permisos" },
    ],
  },
  clubs: {
    label: "Clubes",
    permissions: [
      { key: CLUBS_READ, label: "Ver clubes" },
      { key: CLUBS_CREATE, label: "Crear club" },
      { key: CLUBS_UPDATE, label: "Editar club" },
      { key: CLUBS_DELETE, label: "Eliminar club" },
      { key: CLUBS_INSTANCES_READ, label: "Ver instancias" },
      { key: CLUBS_INSTANCES_CREATE, label: "Crear instancia" },
      { key: CLUBS_INSTANCES_UPDATE, label: "Editar instancia" },
      { key: CLUBS_INSTANCES_DELETE, label: "Eliminar instancia" },
      { key: CLUB_ROLES_READ, label: "Ver roles de club" },
      { key: CLUB_ROLES_ASSIGN, label: "Asignar rol de club" },
      { key: CLUB_ROLES_REVOKE, label: "Revocar rol de club" },
    ],
  },
  geography: {
    label: "Jerarquía Geográfica",
    permissions: [
      { key: COUNTRIES_READ, label: "Ver países" },
      { key: COUNTRIES_CREATE, label: "Crear país" },
      { key: COUNTRIES_UPDATE, label: "Editar país" },
      { key: COUNTRIES_DELETE, label: "Eliminar país" },
      { key: UNIONS_READ, label: "Ver uniones" },
      { key: UNIONS_CREATE, label: "Crear unión" },
      { key: UNIONS_UPDATE, label: "Editar unión" },
      { key: UNIONS_DELETE, label: "Eliminar unión" },
      { key: LOCAL_FIELDS_READ, label: "Ver campos locales" },
      { key: LOCAL_FIELDS_CREATE, label: "Crear campo local" },
      { key: LOCAL_FIELDS_UPDATE, label: "Editar campo local" },
      { key: LOCAL_FIELDS_DELETE, label: "Eliminar campo local" },
      { key: CHURCHES_READ, label: "Ver iglesias" },
      { key: CHURCHES_CREATE, label: "Crear iglesia" },
      { key: CHURCHES_UPDATE, label: "Editar iglesia" },
      { key: CHURCHES_DELETE, label: "Eliminar iglesia" },
    ],
  },
  catalogs: {
    label: "Catálogos",
    permissions: [
      { key: CATALOGS_READ, label: "Ver catálogos" },
      { key: CATALOGS_CREATE, label: "Crear ítem" },
      { key: CATALOGS_UPDATE, label: "Editar ítem" },
      { key: CATALOGS_DELETE, label: "Eliminar ítem" },
    ],
  },
  classes_honors: {
    label: "Clases y Honores",
    permissions: [
      { key: CLASSES_READ, label: "Ver clases" },
      { key: CLASSES_CREATE, label: "Crear clase" },
      { key: CLASSES_UPDATE, label: "Editar clase" },
      { key: CLASSES_DELETE, label: "Eliminar clase" },
      { key: HONORS_READ, label: "Ver honores" },
      { key: HONORS_CREATE, label: "Crear honor" },
      { key: HONORS_UPDATE, label: "Editar honor" },
      { key: HONORS_DELETE, label: "Eliminar honor" },
      { key: HONOR_CATEGORIES_READ, label: "Ver categorías" },
      { key: HONOR_CATEGORIES_CREATE, label: "Crear categoría" },
      { key: HONOR_CATEGORIES_UPDATE, label: "Editar categoría" },
      { key: HONOR_CATEGORIES_DELETE, label: "Eliminar categoría" },
    ],
  },
  activities: {
    label: "Actividades",
    permissions: [
      { key: ACTIVITIES_READ, label: "Ver actividades" },
      { key: ACTIVITIES_CREATE, label: "Crear actividad" },
      { key: ACTIVITIES_UPDATE, label: "Editar actividad" },
      { key: ACTIVITIES_DELETE, label: "Eliminar actividad" },
      { key: ATTENDANCE_READ, label: "Ver asistencia" },
      { key: ATTENDANCE_MANAGE, label: "Gestionar asistencia" },
    ],
  },
  finances: {
    label: "Finanzas",
    permissions: [
      { key: FINANCES_READ, label: "Ver finanzas" },
      { key: FINANCES_CREATE, label: "Crear registro" },
      { key: FINANCES_UPDATE, label: "Editar registro" },
      { key: FINANCES_DELETE, label: "Eliminar registro" },
      { key: FINANCES_EXPORT, label: "Exportar" },
    ],
  },
  inventory: {
    label: "Inventario",
    permissions: [
      { key: INVENTORY_READ, label: "Ver inventario" },
      { key: INVENTORY_CREATE, label: "Crear ítem" },
      { key: INVENTORY_UPDATE, label: "Editar ítem" },
      { key: INVENTORY_DELETE, label: "Eliminar ítem" },
    ],
  },
  reports: {
    label: "Reportes",
    permissions: [
      { key: REPORTS_VIEW, label: "Ver reportes" },
      { key: REPORTS_EXPORT, label: "Exportar reportes" },
      { key: DASHBOARD_VIEW, label: "Ver dashboard" },
    ],
  },
  system: {
    label: "Sistema",
    permissions: [
      { key: SETTINGS_READ, label: "Ver configuración" },
      { key: SETTINGS_UPDATE, label: "Editar configuración" },
      { key: ECCLESIASTICAL_YEARS_READ, label: "Ver años eclesiásticos" },
      { key: ECCLESIASTICAL_YEARS_CREATE, label: "Crear año eclesiástico" },
      { key: ECCLESIASTICAL_YEARS_UPDATE, label: "Editar año eclesiástico" },
    ],
  },
} as const;

// Tipo derivado de las constantes (acepta cualquier string para compatibilidad con DB)
export type PermissionKey = string;
