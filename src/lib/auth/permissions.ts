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
export const USERS_UPDATE_PROFILE = "users:update_profile";
export const USERS_UPDATE_ADMIN = "users:update_admin";
export const HEALTH_READ = "health:read";
export const HEALTH_UPDATE = "health:update";
export const EMERGENCY_CONTACTS_READ = "emergency_contacts:read";
export const EMERGENCY_CONTACTS_UPDATE = "emergency_contacts:update";
export const LEGAL_REPRESENTATIVE_READ = "legal_representative:read";
export const LEGAL_REPRESENTATIVE_UPDATE = "legal_representative:update";
export const POST_REGISTRATION_READ = "post_registration:read";
export const REGISTRATION_COMPLETE = "registration:complete";

// --- Roles y Permisos ---
export const ROLES_READ = "roles:read";
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
export const DISTRICTS_READ = "districts:read";
export const DISTRICTS_CREATE = "districts:create";
export const DISTRICTS_UPDATE = "districts:update";
export const DISTRICTS_DELETE = "districts:delete";
export const CHURCHES_READ = "churches:read";
export const CHURCHES_CREATE = "churches:create";
export const CHURCHES_UPDATE = "churches:update";
export const CHURCHES_DELETE = "churches:delete";

// --- Catálogos de Referencia ---
export const CATALOGS_READ = "catalogs:read";
export const CATALOGS_CREATE = "catalogs:create";
export const CATALOGS_UPDATE = "catalogs:update";
export const CATALOGS_DELETE = "catalogs:delete";
export const RELATIONSHIP_TYPES_READ = "relationship_types:read";
export const RELATIONSHIP_TYPES_CREATE = "relationship_types:create";
export const RELATIONSHIP_TYPES_UPDATE = "relationship_types:update";
export const RELATIONSHIP_TYPES_DELETE = "relationship_types:delete";
export const ALLERGIES_READ = "allergies:read";
export const ALLERGIES_CREATE = "allergies:create";
export const ALLERGIES_UPDATE = "allergies:update";
export const ALLERGIES_DELETE = "allergies:delete";
export const DISEASES_READ = "diseases:read";
export const DISEASES_CREATE = "diseases:create";
export const DISEASES_UPDATE = "diseases:update";
export const DISEASES_DELETE = "diseases:delete";
export const MEDICINES_READ = "medicines:read";
export const MEDICINES_CREATE = "medicines:create";
export const MEDICINES_UPDATE = "medicines:update";
export const MEDICINES_DELETE = "medicines:delete";
export const CLUB_TYPES_READ = "club_types:read";
export const CLUB_TYPES_CREATE = "club_types:create";
export const CLUB_TYPES_UPDATE = "club_types:update";
export const CLUB_TYPES_DELETE = "club_types:delete";
export const CLUB_IDEALS_READ = "club_ideals:read";
export const CLUB_IDEALS_CREATE = "club_ideals:create";
export const CLUB_IDEALS_UPDATE = "club_ideals:update";
export const CLUB_IDEALS_DELETE = "club_ideals:delete";
export const ACTIVITY_TYPES_READ = "activity_types:read";
export const ACTIVITY_TYPES_CREATE = "activity_types:create";
export const ACTIVITY_TYPES_UPDATE = "activity_types:update";
export const ACTIVITY_TYPES_DELETE = "activity_types:delete";

// --- Clases y Honores ---
export const CLASSES_READ = "classes:read";
export const CLASSES_SUBMIT_PROGRESS = "classes:submit_progress";
export const CLASSES_MANAGE = "classes:manage";
export const CLASS_MODULES_MANAGE = "class_modules:manage";
export const CLASS_SECTIONS_MANAGE = "class_sections:manage";
export const HONORS_READ = "honors:read";
export const HONORS_CREATE = "honors:create";
export const HONORS_UPDATE = "honors:update";
export const HONORS_DELETE = "honors:delete";
export const MASTER_HONORS_MANAGE = "master_honors:manage";
export const USER_HONORS_SUBMIT = "user_honors:submit";
export const USER_HONORS_VALIDATE = "user_honors:validate";
export const HONOR_CATEGORIES_READ = "honor_categories:read";
export const HONOR_CATEGORIES_CREATE = "honor_categories:create";
export const HONOR_CATEGORIES_UPDATE = "honor_categories:update";
export const HONOR_CATEGORIES_DELETE = "honor_categories:delete";

// --- Carpetas (Folders) ---
export const FOLDERS_MANAGE = "folders:manage";
export const FOLDER_MODULES_MANAGE = "folder_modules:manage";
export const FOLDER_SECTIONS_MANAGE = "folder_sections:manage";

// --- Categorías de Finanzas e Inventario ---
export const FINANCE_CATEGORIES_MANAGE = "finance_categories:manage";
export const INVENTORY_CATEGORIES_MANAGE = "inventory_categories:manage";

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

// 8.4-C extended institutional rankings
export const RANKING_WEIGHTS_READ = "ranking_weights:read";
export const RANKING_WEIGHTS_WRITE = "ranking_weights:write";

// 8.4-A enrollment-level rankings
export const MEMBER_RANKINGS_READ_SELF = "member_rankings:read_self";
export const MEMBER_RANKINGS_READ_SECTION = "member_rankings:read_section";
export const MEMBER_RANKINGS_READ_CLUB = "member_rankings:read_club";
export const MEMBER_RANKINGS_READ_LF = "member_rankings:read_lf";
export const MEMBER_RANKINGS_READ_GLOBAL = "member_rankings:read_global";

export const MEMBER_RANKING_WEIGHTS_READ = "member_ranking_weights:read";
export const MEMBER_RANKING_WEIGHTS_WRITE = "member_ranking_weights:write";

export const SECTION_RANKINGS_READ_CLUB = "section_rankings:read_club";
export const SECTION_RANKINGS_READ_LF = "section_rankings:read_lf";
export const SECTION_RANKINGS_READ_GLOBAL = "section_rankings:read_global";

// --- Categorías de Premios (Award Categories) ---
export const AWARD_CATEGORIES_CREATE = "award_categories:create";
export const AWARD_CATEGORIES_READ = "award_categories:read";
export const AWARD_CATEGORIES_UPDATE = "award_categories:update";
export const AWARD_CATEGORIES_DELETE = "award_categories:delete";

// --- Reportes y Dashboard ---
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
export const ECCLESIASTICAL_YEARS_READ = "ecclesiastical_years:read";
export const ECCLESIASTICAL_YEARS_CREATE = "ecclesiastical_years:create";
export const ECCLESIASTICAL_YEARS_UPDATE = "ecclesiastical_years:update";

// ═══════════════════════════════════════════════════════════════════════════
// Agrupación por módulo (útil para UI de asignación de permisos)
// Labels removed — use getPermissionGroupLabel(t, groupKey) and
// getPermissionLabel(t, permissionKey) for localised display.
// ═══════════════════════════════════════════════════════════════════════════
export const PERMISSION_GROUPS = {
  users: {
    permissions: [
      { key: USERS_READ },
      { key: USERS_READ_DETAIL },
      { key: USERS_UPDATE_PROFILE },
      { key: USERS_UPDATE_ADMIN },
    ],
  },
  roles: {
    permissions: [
      { key: ROLES_READ },
      { key: PERMISSIONS_READ },
      { key: PERMISSIONS_ASSIGN },
    ],
  },
  clubs: {
    permissions: [
      { key: CLUBS_READ },
      { key: CLUBS_CREATE },
      { key: CLUBS_UPDATE },
      { key: CLUBS_DELETE },
      { key: CLUB_SECTIONS_READ },
      { key: CLUB_SECTIONS_CREATE },
      { key: CLUB_SECTIONS_UPDATE },
      { key: CLUB_ROLES_READ },
      { key: CLUB_ROLES_ASSIGN },
      { key: CLUB_ROLES_REVOKE },
      { key: CLUB_MEMBERS_APPROVE },
      { key: CLUB_MEMBERS_REJECT },
      { key: CLUB_MEMBERS_LIST_PENDING },
    ],
  },
  units: {
    permissions: [
      { key: UNITS_READ },
    ],
  },
  member_of_month: {
    permissions: [
      { key: MOM_READ },
      { key: MOM_SUPERVISE },
      { key: MOM_EVALUATE },
    ],
  },
  scoring_categories: {
    permissions: [
      { key: SCORING_CATEGORIES_READ },
      { key: SCORING_CATEGORIES_MANAGE },
    ],
  },
  requests: {
    permissions: [
      { key: REQUESTS_READ },
      { key: REQUESTS_REVIEW },
    ],
  },
  user_certifications: {
    permissions: [
      { key: USER_CERTIFICATIONS_READ },
      { key: USER_CERTIFICATIONS_MANAGE },
    ],
  },
  user_folders: {
    permissions: [
      { key: USER_FOLDERS_READ },
      { key: USER_FOLDERS_MANAGE },
    ],
  },
  geography: {
    permissions: [
      { key: COUNTRIES_READ },
      { key: COUNTRIES_CREATE },
      { key: COUNTRIES_UPDATE },
      { key: COUNTRIES_DELETE },
      { key: UNIONS_READ },
      { key: UNIONS_CREATE },
      { key: UNIONS_UPDATE },
      { key: UNIONS_DELETE },
      { key: LOCAL_FIELDS_READ },
      { key: LOCAL_FIELDS_CREATE },
      { key: LOCAL_FIELDS_UPDATE },
      { key: LOCAL_FIELDS_DELETE },
      { key: DISTRICTS_READ },
      { key: DISTRICTS_CREATE },
      { key: DISTRICTS_UPDATE },
      { key: DISTRICTS_DELETE },
      { key: CHURCHES_READ },
      { key: CHURCHES_CREATE },
      { key: CHURCHES_UPDATE },
      { key: CHURCHES_DELETE },
    ],
  },
  catalogs: {
    permissions: [
      { key: CATALOGS_READ },
      { key: CATALOGS_CREATE },
      { key: CATALOGS_UPDATE },
      { key: CATALOGS_DELETE },
      { key: RELATIONSHIP_TYPES_READ },
      { key: RELATIONSHIP_TYPES_CREATE },
      { key: RELATIONSHIP_TYPES_UPDATE },
      { key: RELATIONSHIP_TYPES_DELETE },
      { key: ALLERGIES_READ },
      { key: ALLERGIES_CREATE },
      { key: ALLERGIES_UPDATE },
      { key: ALLERGIES_DELETE },
      { key: DISEASES_READ },
      { key: DISEASES_CREATE },
      { key: DISEASES_UPDATE },
      { key: DISEASES_DELETE },
      { key: MEDICINES_READ },
      { key: MEDICINES_CREATE },
      { key: MEDICINES_UPDATE },
      { key: MEDICINES_DELETE },
      { key: CLUB_TYPES_READ },
      { key: CLUB_TYPES_CREATE },
      { key: CLUB_TYPES_UPDATE },
      { key: CLUB_TYPES_DELETE },
      { key: CLUB_IDEALS_READ },
      { key: CLUB_IDEALS_CREATE },
      { key: CLUB_IDEALS_UPDATE },
      { key: CLUB_IDEALS_DELETE },
      { key: ACTIVITY_TYPES_READ },
      { key: ACTIVITY_TYPES_CREATE },
      { key: ACTIVITY_TYPES_UPDATE },
      { key: ACTIVITY_TYPES_DELETE },
    ],
  },
  classes_honors: {
    permissions: [
      { key: CLASSES_READ },
      { key: CLASSES_SUBMIT_PROGRESS },
      { key: HONORS_READ },
      { key: HONORS_CREATE },
      { key: HONORS_UPDATE },
      { key: HONORS_DELETE },
      { key: USER_HONORS_SUBMIT },
      { key: USER_HONORS_VALIDATE },
      { key: HONOR_CATEGORIES_READ },
      { key: HONOR_CATEGORIES_CREATE },
      { key: HONOR_CATEGORIES_UPDATE },
      { key: HONOR_CATEGORIES_DELETE },
    ],
  },
  activities: {
    permissions: [
      { key: ACTIVITIES_READ },
      { key: ACTIVITIES_CREATE },
      { key: ACTIVITIES_UPDATE },
      { key: ACTIVITIES_DELETE },
      { key: ATTENDANCE_READ },
      { key: ATTENDANCE_MANAGE },
    ],
  },
  camporees: {
    permissions: [
      { key: CAMPOREES_READ },
      { key: CAMPOREES_CREATE },
      { key: CAMPOREES_UPDATE },
      { key: CAMPOREES_DELETE },
    ],
  },
  validation: {
    permissions: [
      { key: VALIDATION_READ },
      { key: VALIDATION_SUBMIT },
      { key: VALIDATION_REVIEW },
    ],
  },
  finances: {
    permissions: [
      { key: FINANCES_READ },
      { key: FINANCES_CREATE },
      { key: FINANCES_UPDATE },
      { key: FINANCES_DELETE },
    ],
  },
  inventory: {
    permissions: [
      { key: INVENTORY_READ },
      { key: INVENTORY_CREATE },
      { key: INVENTORY_UPDATE },
      { key: INVENTORY_DELETE },
    ],
  },
  reports: {
    permissions: [
      { key: REPORTS_READ },
      { key: REPORTS_DOWNLOAD },
      { key: DASHBOARD_VIEW },
    ],
  },
  notifications: {
    permissions: [
      { key: NOTIFICATIONS_SEND },
      { key: NOTIFICATIONS_BROADCAST },
      { key: NOTIFICATIONS_CLUB },
    ],
  },
  resources: {
    permissions: [
      { key: RESOURCES_READ },
      { key: RESOURCES_CREATE },
      { key: RESOURCES_UPDATE },
      { key: RESOURCES_DELETE },
      { key: RESOURCE_CATEGORIES_READ },
      { key: RESOURCE_CATEGORIES_CREATE },
      { key: RESOURCE_CATEGORIES_UPDATE },
      { key: RESOURCE_CATEGORIES_DELETE },
    ],
  },
  system: {
    permissions: [
      { key: ECCLESIASTICAL_YEARS_READ },
      { key: ECCLESIASTICAL_YEARS_CREATE },
      { key: ECCLESIASTICAL_YEARS_UPDATE },
    ],
  },
} as const;

// Tipo derivado de las constantes (acepta cualquier string para compatibilidad con DB)
export type PermissionKey = string;

// ═══════════════════════════════════════════════════════════════════════════
// i18n helpers — use these in all UI components instead of hardcoded strings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the localised label for a permission key.
 * Looks up `rbac.permissions.<key>` in the active locale.
 * Falls back to the raw key string when no translation exists.
 *
 * @example
 *   const t = useTranslations("rbac");
 *   getPermissionLabel(t, "clubs:read") // → "Ver clubes" (es)
 */
export function getPermissionLabel(
  t: (key: string) => string,
  permissionKey: string,
): string {
  // next-intl colon keys require dot notation for nested lookup
  const safeKey = permissionKey.replace(":", ".");
  try {
    return t(`permissions.${safeKey}` as Parameters<typeof t>[0]);
  } catch {
    return permissionKey;
  }
}

/**
 * Returns the localised label for a permission group.
 * Looks up `rbac.permissionGroups.<groupKey>` in the active locale.
 * Falls back to the raw groupKey string when no translation exists.
 *
 * @example
 *   const t = useTranslations("rbac");
 *   getPermissionGroupLabel(t, "clubs") // → "Clubes" (es)
 */
export function getPermissionGroupLabel(
  t: (key: string) => string,
  groupKey: string,
): string {
  try {
    return t(`permissionGroups.${groupKey}` as Parameters<typeof t>[0]);
  } catch {
    return groupKey;
  }
}
