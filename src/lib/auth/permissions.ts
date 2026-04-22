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
export const USERS_UPDATE_PROFILE = "users:update_profile";
export const USERS_UPDATE_ADMIN = "users:update_admin";
export const USERS_DELETE = "users:delete";
export const USERS_EXPORT = "users:export";
export const HEALTH_READ = "health:read";
export const HEALTH_UPDATE = "health:update";
export const EMERGENCY_CONTACTS_READ = "emergency_contacts:read";
export const EMERGENCY_CONTACTS_UPDATE = "emergency_contacts:update";
export const LEGAL_REPRESENTATIVE_READ = "legal_representative:read";
export const LEGAL_REPRESENTATIVE_UPDATE = "legal_representative:update";
export const POST_REGISTRATION_READ = "post_registration:read";
export const POST_REGISTRATION_UPDATE = "post_registration:update";
export const REGISTRATION_COMPLETE = "registration:complete";

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
// Club sections (consolidated from club_instances)
export const CLUB_SECTIONS_READ = "club_sections:read";
export const CLUB_SECTIONS_CREATE = "club_sections:create";
export const CLUB_SECTIONS_UPDATE = "club_sections:update";
export const CLUB_SECTIONS_DELETE = "club_sections:delete";
export const CLUB_ROLES_READ = "club_roles:read";
export const CLUB_ROLES_ASSIGN = "club_roles:assign";
export const CLUB_ROLES_REVOKE = "club_roles:revoke";
// Club membership approval
export const CLUB_MEMBERS_APPROVE = "club_members:approve";
export const CLUB_MEMBERS_REJECT = "club_members:reject";
export const CLUB_MEMBERS_LIST_PENDING = "club_members:list_pending";

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
export const CLASSES_SUBMIT_PROGRESS = "classes:submit_progress";
export const CLASSES_VALIDATE = "classes:validate";
export const CLASSES_DELETE = "classes:delete";
export const HONORS_READ = "honors:read";
export const HONORS_CREATE = "honors:create";
export const HONORS_UPDATE = "honors:update";
export const HONORS_DELETE = "honors:delete";
export const USER_HONORS_SUBMIT = "user_honors:submit";
export const USER_HONORS_VALIDATE = "user_honors:validate";
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

// --- Camporees (management) ---
export const CAMPOREES_READ   = "camporees:read";
export const CAMPOREES_CREATE = "camporees:create";
export const CAMPOREES_UPDATE = "camporees:update";
export const CAMPOREES_DELETE = "camporees:delete";

// --- Validación (Validation) ---
export const VALIDATION_SUBMIT = "validation:submit";
export const VALIDATION_REVIEW = "validation:review";
export const VALIDATION_READ   = "validation:read";

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

// --- Notificaciones ---
export const NOTIFICATIONS_SEND = "notifications:send";
export const NOTIFICATIONS_BROADCAST = "notifications:broadcast";
export const NOTIFICATIONS_CLUB = "notifications:club";

// --- Unidades (Units) ---
export const UNITS_READ = "units:read";

// --- Miembro del Mes ---
export const MOM_READ      = "mom:read";
export const MOM_SUPERVISE = "mom:supervise";
export const MOM_EVALUATE  = "mom:evaluate";

// --- Scoring Categories ---
export const SCORING_CATEGORIES_READ   = "scoring_categories:read";
export const SCORING_CATEGORIES_MANAGE = "scoring_categories:manage";

// --- Solicitudes (Requests) ---
export const REQUESTS_READ   = "requests:read";
export const REQUESTS_REVIEW = "requests:review";

// --- Certificaciones de Usuario (User Certifications) ---
export const USER_CERTIFICATIONS_READ   = "user_certifications:read";
export const USER_CERTIFICATIONS_MANAGE = "user_certifications:manage";

// --- Carpetas de Usuario (User Folders) ---
export const USER_FOLDERS_READ   = "user_folders:read";
export const USER_FOLDERS_MANAGE = "user_folders:manage";

// --- Logros (Achievements) ---
export const ACHIEVEMENTS_READ = "achievements:read";
export const ACHIEVEMENTS_MANAGE = "achievements:manage";

// --- Rankings ---
export const RANKINGS_READ = "rankings:read";
export const RANKINGS_RECALCULATE = "rankings:recalculate";

// --- Categorías de Premios (Award Categories) ---
export const AWARD_CATEGORIES_CREATE = "award_categories:create";
export const AWARD_CATEGORIES_READ = "award_categories:read";
export const AWARD_CATEGORIES_UPDATE = "award_categories:update";
export const AWARD_CATEGORIES_DELETE = "award_categories:delete";

// --- Reportes y Dashboard ---
export const REPORTS_VIEW = "reports:view";
export const REPORTS_EXPORT = "reports:export";
export const REPORTS_READ = "reports:read";
export const REPORTS_DOWNLOAD = "reports:download";
export const DASHBOARD_VIEW = "dashboard:view";

// --- Recursos ---
export const RESOURCES_READ = "resources:read";
export const RESOURCES_CREATE = "resources:create";
export const RESOURCES_UPDATE = "resources:update";
export const RESOURCES_DELETE = "resources:delete";
export const RESOURCE_CATEGORIES_READ = "resource_categories:read";
export const RESOURCE_CATEGORIES_CREATE = "resource_categories:create";
export const RESOURCE_CATEGORIES_UPDATE = "resource_categories:update";
export const RESOURCE_CATEGORIES_DELETE = "resource_categories:delete";

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
      { key: USERS_UPDATE_PROFILE, label: "Editar perfil propio" },
      { key: USERS_UPDATE_ADMIN, label: "Gestión admin de usuarios" },
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
      { key: CLUB_SECTIONS_READ, label: "Ver secciones" },
      { key: CLUB_SECTIONS_CREATE, label: "Crear sección" },
      { key: CLUB_SECTIONS_UPDATE, label: "Editar sección" },
      { key: CLUB_SECTIONS_DELETE, label: "Eliminar sección" },
      { key: CLUB_ROLES_READ, label: "Ver roles de club" },
      { key: CLUB_ROLES_ASSIGN, label: "Asignar rol de club" },
      { key: CLUB_ROLES_REVOKE, label: "Revocar rol de club" },
      { key: CLUB_MEMBERS_APPROVE, label: "Aprobar membresía" },
      { key: CLUB_MEMBERS_REJECT, label: "Rechazar membresía" },
      { key: CLUB_MEMBERS_LIST_PENDING, label: "Ver solicitudes pendientes" },
    ],
  },
  units: {
    label: "Unidades",
    permissions: [
      { key: UNITS_READ, label: "Ver unidades / miembro del mes" },
    ],
  },
  member_of_month: {
    label: "Miembro del Mes",
    permissions: [
      { key: MOM_READ,      label: "Ver miembro del mes" },
      { key: MOM_SUPERVISE, label: "Supervisar multi-sección (admin/coordinador)" },
      { key: MOM_EVALUATE,  label: "Disparar evaluación manual" },
    ],
  },
  scoring_categories: {
    label: "Categorías de Puntuación",
    permissions: [
      { key: SCORING_CATEGORIES_READ,   label: "Ver categorías de puntuación" },
      { key: SCORING_CATEGORIES_MANAGE, label: "Gestionar categorías de puntuación (unions + campos locales)" },
    ],
  },
  requests: {
    label: "Solicitudes",
    permissions: [
      { key: REQUESTS_READ,   label: "Ver solicitudes de transferencia y asignación" },
      { key: REQUESTS_REVIEW, label: "Aprobar/rechazar solicitudes" },
    ],
  },
  user_certifications: {
    label: "Certificaciones de Usuario (Admin)",
    permissions: [
      { key: USER_CERTIFICATIONS_READ,   label: "Ver progreso de certificaciones" },
      { key: USER_CERTIFICATIONS_MANAGE, label: "Inscribir / actualizar / borrar certificaciones" },
    ],
  },
  user_folders: {
    label: "Carpetas de Usuario (Admin)",
    permissions: [
      { key: USER_FOLDERS_READ,   label: "Ver inscripción y progreso de carpetas" },
      { key: USER_FOLDERS_MANAGE, label: "Inscribir / actualizar / borrar asignaciones de carpeta" },
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
    label: "Clases y Especialidades",
    permissions: [
      { key: CLASSES_READ, label: "Ver clases" },
      { key: CLASSES_CREATE, label: "Crear clase" },
      { key: CLASSES_UPDATE, label: "Editar clase" },
      { key: CLASSES_SUBMIT_PROGRESS, label: "Enviar progreso de clase" },
      { key: CLASSES_VALIDATE, label: "Validar clases" },
      { key: CLASSES_DELETE, label: "Eliminar clase" },
      { key: HONORS_READ, label: "Ver especialidades" },
      { key: HONORS_CREATE, label: "Crear especialidad" },
      { key: HONORS_UPDATE, label: "Editar especialidad" },
      { key: HONORS_DELETE, label: "Eliminar especialidad" },
      { key: USER_HONORS_SUBMIT, label: "Enviar progreso de honor" },
      { key: USER_HONORS_VALIDATE, label: "Validar honores" },
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
  camporees: {
    label: "Camporees",
    permissions: [
      { key: CAMPOREES_READ,   label: "Ver camporees" },
      { key: CAMPOREES_CREATE, label: "Crear camporees" },
      { key: CAMPOREES_UPDATE, label: "Actualizar camporees" },
      { key: CAMPOREES_DELETE, label: "Desactivar camporees" },
    ],
  },
  validation: {
    label: "Validación",
    permissions: [
      { key: VALIDATION_READ,   label: "Ver cola pendiente, historial y elegibilidad" },
      { key: VALIDATION_SUBMIT, label: "Enviar progreso para revisión" },
      { key: VALIDATION_REVIEW, label: "Aprobar/rechazar progreso enviado" },
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
      { key: REPORTS_READ, label: "Leer reportes mensuales" },
      { key: REPORTS_DOWNLOAD, label: "Descargar PDF de reportes" },
      { key: DASHBOARD_VIEW, label: "Ver dashboard" },
    ],
  },
  notifications: {
    label: "Notificaciones",
    permissions: [
      { key: NOTIFICATIONS_SEND, label: "Enviar directa" },
      { key: NOTIFICATIONS_BROADCAST, label: "Enviar broadcast" },
      { key: NOTIFICATIONS_CLUB, label: "Enviar por club" },
    ],
  },
  resources: {
    label: "Recursos",
    permissions: [
      { key: RESOURCES_READ, label: "Ver recursos" },
      { key: RESOURCES_CREATE, label: "Subir recurso" },
      { key: RESOURCES_UPDATE, label: "Editar recurso" },
      { key: RESOURCES_DELETE, label: "Eliminar recurso" },
      { key: RESOURCE_CATEGORIES_READ, label: "Ver categorías de recursos" },
      { key: RESOURCE_CATEGORIES_CREATE, label: "Crear categoría de recursos" },
      { key: RESOURCE_CATEGORIES_UPDATE, label: "Editar categoría de recursos" },
      { key: RESOURCE_CATEGORIES_DELETE, label: "Eliminar categoría de recursos" },
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
