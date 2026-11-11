// ═══════════════════════════════════════════════════════════════════════════
// Constantes de permisos del sistema SACDIA
// ═══════════════════════════════════════════════════════════════════════════
// La fuente de verdad es el catálogo generado en `src/lib/auth/generated/`,
// regenerado desde el seed del backend con `pnpm authz:generate`.
// Este archivo solo nombra las claves para autocompletado y las agrupa;
// una clave ausente del catálogo hace fallar `tsc`.
// ═══════════════════════════════════════════════════════════════════════════

import type { PermissionKey } from "./generated/permission-keys";

// --- Gestión de Usuarios ---
export const USERS_READ = "users:read" satisfies PermissionKey;
export const USERS_READ_DETAIL = "users:read_detail" satisfies PermissionKey;
export const USERS_UPDATE_PROFILE = "users:update_profile" satisfies PermissionKey;
export const USERS_UPDATE_ADMIN = "users:update_admin" satisfies PermissionKey;
export const USERS_CREATE = "users:create" satisfies PermissionKey;
export const USERS_BULK_CREATE = "users:bulk_create" satisfies PermissionKey;
export const HEALTH_READ = "health:read" satisfies PermissionKey;
export const HEALTH_UPDATE = "health:update" satisfies PermissionKey;
export const EMERGENCY_CONTACTS_READ = "emergency_contacts:read" satisfies PermissionKey;
export const EMERGENCY_CONTACTS_UPDATE = "emergency_contacts:update" satisfies PermissionKey;
export const LEGAL_REPRESENTATIVE_READ = "legal_representative:read" satisfies PermissionKey;
export const LEGAL_REPRESENTATIVE_UPDATE = "legal_representative:update" satisfies PermissionKey;
export const POST_REGISTRATION_READ = "post_registration:read" satisfies PermissionKey;
export const REGISTRATION_COMPLETE = "registration:complete" satisfies PermissionKey;

// --- Roles y Permisos ---
export const ROLES_READ = "roles:read" satisfies PermissionKey;
export const PERMISSIONS_READ = "permissions:read" satisfies PermissionKey;
export const PERMISSIONS_ASSIGN = "permissions:assign" satisfies PermissionKey;
export const AUDIT_READ = "audit:read" satisfies PermissionKey;

// --- Clubes ---
export const CLUBS_READ = "clubs:read" satisfies PermissionKey;
export const CLUBS_CREATE = "clubs:create" satisfies PermissionKey;
export const CLUBS_UPDATE = "clubs:update" satisfies PermissionKey;
export const CLUBS_DELETE = "clubs:delete" satisfies PermissionKey;
// Club sections (consolidated from club_instances)
export const CLUB_SECTIONS_READ = "club_sections:read" satisfies PermissionKey;
export const CLUB_SECTIONS_CREATE = "club_sections:create" satisfies PermissionKey;
export const CLUB_SECTIONS_UPDATE = "club_sections:update" satisfies PermissionKey;
export const CLUB_ROLES_READ = "club_roles:read" satisfies PermissionKey;
export const CLUB_ROLES_ASSIGN = "club_roles:assign" satisfies PermissionKey;
export const CLUB_ROLES_REVOKE = "club_roles:revoke" satisfies PermissionKey;
export const COORDINATION_MANAGE = "coordination:manage" satisfies PermissionKey;
// Club membership approval
export const CLUB_MEMBERS_APPROVE = "club_members:approve" satisfies PermissionKey;
export const CLUB_MEMBERS_REJECT = "club_members:reject" satisfies PermissionKey;
export const CLUB_MEMBERS_LIST_PENDING = "club_members:list_pending" satisfies PermissionKey;
// Verify a minor's paper consent form. Coordinators hold it without club_members:approve.
export const CONSENT_VERIFY = "consent:verify" satisfies PermissionKey;

// --- Jerarquía Geográfica ---
export const COUNTRIES_READ = "countries:read" satisfies PermissionKey;
export const COUNTRIES_CREATE = "countries:create" satisfies PermissionKey;
export const COUNTRIES_UPDATE = "countries:update" satisfies PermissionKey;
export const COUNTRIES_DELETE = "countries:delete" satisfies PermissionKey;
export const UNIONS_READ = "unions:read" satisfies PermissionKey;
export const UNIONS_CREATE = "unions:create" satisfies PermissionKey;
export const UNIONS_UPDATE = "unions:update" satisfies PermissionKey;
export const UNIONS_DELETE = "unions:delete" satisfies PermissionKey;
export const LOCAL_FIELDS_READ = "local_fields:read" satisfies PermissionKey;
export const LOCAL_FIELDS_CREATE = "local_fields:create" satisfies PermissionKey;
export const LOCAL_FIELDS_UPDATE = "local_fields:update" satisfies PermissionKey;
export const LOCAL_FIELDS_DELETE = "local_fields:delete" satisfies PermissionKey;
export const DISTRICTS_READ = "districts:read" satisfies PermissionKey;
export const DISTRICTS_CREATE = "districts:create" satisfies PermissionKey;
export const DISTRICTS_UPDATE = "districts:update" satisfies PermissionKey;
export const DISTRICTS_DELETE = "districts:delete" satisfies PermissionKey;
export const CHURCHES_READ = "churches:read" satisfies PermissionKey;
export const CHURCHES_CREATE = "churches:create" satisfies PermissionKey;
export const CHURCHES_UPDATE = "churches:update" satisfies PermissionKey;
export const CHURCHES_DELETE = "churches:delete" satisfies PermissionKey;

// --- Catálogos de Referencia ---
export const CATALOGS_READ = "catalogs:read" satisfies PermissionKey;
export const CATALOGS_CREATE = "catalogs:create" satisfies PermissionKey;
export const CATALOGS_UPDATE = "catalogs:update" satisfies PermissionKey;
export const CATALOGS_DELETE = "catalogs:delete" satisfies PermissionKey;

// --- Clases y Honores ---
export const CLASSES_READ = "classes:read" satisfies PermissionKey;
export const CLASSES_SUBMIT_PROGRESS = "classes:submit_progress" satisfies PermissionKey;
export const HONORS_READ = "honors:read" satisfies PermissionKey;
export const HONORS_CREATE = "honors:create" satisfies PermissionKey;
export const HONORS_UPDATE = "honors:update" satisfies PermissionKey;
export const HONORS_DELETE = "honors:delete" satisfies PermissionKey;
export const USER_HONORS_SUBMIT = "user_honors:submit" satisfies PermissionKey;
export const USER_HONORS_VALIDATE = "user_honors:validate" satisfies PermissionKey;
export const HONOR_CATEGORIES_READ = "honor_categories:read" satisfies PermissionKey;
export const HONOR_CATEGORIES_CREATE = "honor_categories:create" satisfies PermissionKey;
export const HONOR_CATEGORIES_UPDATE = "honor_categories:update" satisfies PermissionKey;
export const HONOR_CATEGORIES_DELETE = "honor_categories:delete" satisfies PermissionKey;

// --- Materiales (pedidos / catálogo LF) ---
export const MATERIALS_READ = "materiales:read" satisfies PermissionKey;
export const MATERIALS_CREATE = "materiales:create" satisfies PermissionKey;
export const MATERIALS_APPROVE = "materiales:approve" satisfies PermissionKey;
export const MATERIALS_UPLOAD_RECEIPT = "materiales:upload-receipt" satisfies PermissionKey;
export const MATERIALS_VALIDATE_RECEIPT = "materiales:validate-receipt" satisfies PermissionKey;
export const MATERIALS_DELIVER = "materiales:deliver" satisfies PermissionKey;
export const MATERIALS_MANAGE_INVENTORY = "materiales:manage-inventory" satisfies PermissionKey;
export const MATERIALS_CONFIGURE = "materiales:configure" satisfies PermissionKey;

// --- Actividades ---
export const ACTIVITIES_READ = "activities:read" satisfies PermissionKey;
export const ACTIVITIES_CREATE = "activities:create" satisfies PermissionKey;
export const ACTIVITIES_UPDATE = "activities:update" satisfies PermissionKey;
export const ACTIVITIES_DELETE = "activities:delete" satisfies PermissionKey;
export const ATTENDANCE_READ = "attendance:read" satisfies PermissionKey;
export const ATTENDANCE_MANAGE = "attendance:manage" satisfies PermissionKey;

// --- Camporees (management) ---
export const CAMPOREES_READ   = "camporees:read" satisfies PermissionKey;
export const CAMPOREES_CREATE = "camporees:create" satisfies PermissionKey;
export const CAMPOREES_UPDATE = "camporees:update" satisfies PermissionKey;
export const CAMPOREES_REGISTER = "camporees:register" satisfies PermissionKey;
export const CAMPOREES_DELETE = "camporees:delete" satisfies PermissionKey;

// --- Camporee Event Types (catalog) ---
export const CAMPOREE_EVENT_TYPES_READ   = "camporee_event_types:read" satisfies PermissionKey;
export const CAMPOREE_EVENT_TYPES_CREATE = "camporee_event_types:create" satisfies PermissionKey;
export const CAMPOREE_EVENT_TYPES_UPDATE = "camporee_event_types:update" satisfies PermissionKey;
export const CAMPOREE_EVENT_TYPES_DELETE = "camporee_event_types:delete" satisfies PermissionKey;

// --- Camporee Events (templates + instances) ---
export const CAMPOREE_EVENTS_READ   = "camporee_events:read" satisfies PermissionKey;
export const CAMPOREE_EVENTS_CREATE = "camporee_events:create" satisfies PermissionKey;
export const CAMPOREE_EVENTS_UPDATE = "camporee_events:update" satisfies PermissionKey;
export const CAMPOREE_EVENTS_DELETE = "camporee_events:delete" satisfies PermissionKey;

// --- Validación (Validation) ---
export const VALIDATION_SUBMIT = "validation:submit" satisfies PermissionKey;
export const VALIDATION_REVIEW = "validation:review" satisfies PermissionKey;
export const VALIDATION_READ   = "validation:read" satisfies PermissionKey;


// --- Investidura por autorización ---
// Las reglas de rol (pastor / director-lf / unión / división) viven en el
// backend y llegan como capabilities: `investiture.authorize_requests`,
// `investiture.consult_field_window`, `investiture.configure_field_window`,
// `investiture.assign_district_pastors` (ver generated/capability-keys.ts).

// --- Finanzas ---
export const FINANCES_READ = "finances:read" satisfies PermissionKey;
export const FINANCES_CREATE = "finances:create" satisfies PermissionKey;
export const FINANCES_UPDATE = "finances:update" satisfies PermissionKey;
export const FINANCES_DELETE = "finances:delete" satisfies PermissionKey;

// --- Inventario ---
export const INVENTORY_READ = "inventory:read" satisfies PermissionKey;
export const INVENTORY_CREATE = "inventory:create" satisfies PermissionKey;
export const INVENTORY_UPDATE = "inventory:update" satisfies PermissionKey;
export const INVENTORY_DELETE = "inventory:delete" satisfies PermissionKey;

// --- Notificaciones ---
export const NOTIFICATIONS_SEND = "notifications:send" satisfies PermissionKey;
export const NOTIFICATIONS_BROADCAST = "notifications:broadcast" satisfies PermissionKey;
export const NOTIFICATIONS_CLUB = "notifications:club" satisfies PermissionKey;

// --- Unidades (Units) ---
export const UNITS_READ = "units:read" satisfies PermissionKey;
export const UNITS_UPDATE = "units:update" satisfies PermissionKey;

// --- Miembro del Mes ---
export const MOM_READ      = "mom:read" satisfies PermissionKey;
export const MOM_SUPERVISE = "mom:supervise" satisfies PermissionKey;
export const MOM_EVALUATE  = "mom:evaluate" satisfies PermissionKey;

// --- Scoring Categories ---
export const SCORING_CATEGORIES_READ   = "scoring_categories:read" satisfies PermissionKey;
export const SCORING_CATEGORIES_MANAGE = "scoring_categories:manage" satisfies PermissionKey;

// --- Solicitudes (Requests) ---
export const REQUESTS_READ   = "requests:read" satisfies PermissionKey;
export const REQUESTS_REVIEW = "requests:review" satisfies PermissionKey;

// --- Certificaciones de Usuario (User Certifications) ---
export const USER_CERTIFICATIONS_READ   = "user_certifications:read" satisfies PermissionKey;
export const USER_CERTIFICATIONS_MANAGE = "user_certifications:manage" satisfies PermissionKey;

// --- Logros (Achievements) ---
export const ACHIEVEMENTS_READ = "achievements:read" satisfies PermissionKey;
export const ACHIEVEMENTS_MANAGE = "achievements:manage" satisfies PermissionKey;

// --- Rankings ---
export const RANKINGS_READ = "rankings:read" satisfies PermissionKey;
export const RANKINGS_RECALCULATE = "rankings:recalculate" satisfies PermissionKey;

// 8.4-C extended institutional rankings
export const RANKING_WEIGHTS_READ = "ranking_weights:read" satisfies PermissionKey;
export const RANKING_WEIGHTS_WRITE = "ranking_weights:write" satisfies PermissionKey;

// 8.4-A enrollment-level rankings
export const MEMBER_RANKINGS_READ_SELF = "member_rankings:read_self" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_SECTION = "member_rankings:read_section" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_CLUB = "member_rankings:read_club" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_LF = "member_rankings:read_lf" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_UNION = "member_rankings:read_union" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_DIVISION = "member_rankings:read_division" satisfies PermissionKey;
export const MEMBER_RANKINGS_READ_GLOBAL = "member_rankings:read_global" satisfies PermissionKey;

export const MEMBER_RANKING_WEIGHTS_READ = "member_ranking_weights:read" satisfies PermissionKey;
export const MEMBER_RANKING_WEIGHTS_WRITE = "member_ranking_weights:write" satisfies PermissionKey;

export const SECTION_RANKINGS_READ_CLUB = "section_rankings:read_club" satisfies PermissionKey;
export const SECTION_RANKINGS_READ_LF = "section_rankings:read_lf" satisfies PermissionKey;
export const SECTION_RANKINGS_READ_UNION = "section_rankings:read_union" satisfies PermissionKey;
export const SECTION_RANKINGS_READ_DIVISION = "section_rankings:read_division" satisfies PermissionKey;
export const SECTION_RANKINGS_READ_GLOBAL = "section_rankings:read_global" satisfies PermissionKey;

// --- Categorías de Premios (Award Categories) ---
export const AWARD_CATEGORIES_CREATE = "award_categories:create" satisfies PermissionKey;
export const AWARD_CATEGORIES_READ = "award_categories:read" satisfies PermissionKey;
export const AWARD_CATEGORIES_UPDATE = "award_categories:update" satisfies PermissionKey;
export const AWARD_CATEGORIES_DELETE = "award_categories:delete" satisfies PermissionKey;

// --- Reportes y Dashboard ---
export const REPORTS_READ = "reports:read" satisfies PermissionKey;
export const REPORTS_DOWNLOAD = "reports:download" satisfies PermissionKey;
export const REPORTS_UPDATE = "reports:update" satisfies PermissionKey;

// --- Recursos ---
export const RESOURCES_READ = "resources:read" satisfies PermissionKey;
export const RESOURCES_CREATE = "resources:create" satisfies PermissionKey;
export const RESOURCES_UPDATE = "resources:update" satisfies PermissionKey;
export const RESOURCES_DELETE = "resources:delete" satisfies PermissionKey;
export const RESOURCE_CATEGORIES_READ = "resource_categories:read" satisfies PermissionKey;
export const RESOURCE_CATEGORIES_CREATE = "resource_categories:create" satisfies PermissionKey;
export const RESOURCE_CATEGORIES_UPDATE = "resource_categories:update" satisfies PermissionKey;
export const RESOURCE_CATEGORIES_DELETE = "resource_categories:delete" satisfies PermissionKey;

// --- Sistema ---
export const ECCLESIASTICAL_YEARS_READ = "ecclesiastical_years:read" satisfies PermissionKey;
export const ECCLESIASTICAL_YEARS_CREATE = "ecclesiastical_years:create" satisfies PermissionKey;
export const ECCLESIASTICAL_YEARS_UPDATE = "ecclesiastical_years:update" satisfies PermissionKey;
export const ECCLESIASTICAL_YEARS_DELETE = "ecclesiastical_years:delete" satisfies PermissionKey;

// --- Certificaciones (motor configurable — definición de versiones) ---
export const CERTIFICATIONS_CONFIGURE = "certifications:configure" satisfies PermissionKey;
export const CERTIFICATIONS_PUBLISH = "certifications:publish" satisfies PermissionKey;
export const CERTIFICATIONS_REVIEW = "certifications:review" satisfies PermissionKey;
export const SERVICE_CREDENTIALS_REVIEW = "service_credentials:review" satisfies PermissionKey;
export const CLUB_ENROLLMENTS_VALIDATE = "club_enrollments:validate" satisfies PermissionKey;
export const ROLE_REQUIREMENTS_MANAGE = "role_requirements:manage" satisfies PermissionKey;
export const CERTIFICATIONS_CERTIFY = "certifications:certify" satisfies PermissionKey;

// --- Seguros (capacity model) y órdenes de pago territoriales ---
export const INSURANCE_READ = "insurance:read" satisfies PermissionKey;
export const INSURANCE_CREATE = "insurance:create" satisfies PermissionKey;
export const INSURANCE_UPDATE = "insurance:update" satisfies PermissionKey;
export const INSURANCE_REVIEW = "insurance:review" satisfies PermissionKey;
export const INSURANCE_CONFIGURE = "insurance:configure" satisfies PermissionKey;
export const FIELD_PAYMENT_ORDERS_READ = "field-payment-orders:read" satisfies PermissionKey;
export const FIELD_PAYMENT_ORDERS_REVIEW = "field-payment-orders:review" satisfies PermissionKey;
export const FIELD_PAYMENT_ORDERS_CONFIGURE = "field-payment-orders:configure" satisfies PermissionKey;

// --- Pedidos de mercancía de camporee (distintos de inscripción) ---
export const CAMPOREE_ORDERS_READ = "camporee-orders:read" satisfies PermissionKey;
export const CAMPOREE_ORDERS_CATALOG_MANAGE = "camporee-orders:catalog-manage" satisfies PermissionKey;
export const CAMPOREE_ORDERS_OFFERING_CONFIGURE =
  "camporee-orders:offering-configure" satisfies PermissionKey;
export const CAMPOREE_ORDERS_CREATE = "camporee-orders:create" satisfies PermissionKey;
export const CAMPOREE_ORDERS_UPLOAD_PROOF = "camporee-orders:upload-proof" satisfies PermissionKey;
export const CAMPOREE_ORDERS_REVIEW = "camporee-orders:review" satisfies PermissionKey;
export const CAMPOREE_ORDERS_AUTHORIZE_WITHOUT_PROOF =
  "camporee-orders:authorize-without-proof" satisfies PermissionKey;
export const CAMPOREE_ORDERS_DELIVER = "camporee-orders:deliver" satisfies PermissionKey;
export const CAMPOREE_ORDERS_DISTRIBUTE = "camporee-orders:distribute" satisfies PermissionKey;
export const CAMPOREE_SUPPLIES_READ = "camporee-supplies:read" satisfies PermissionKey;
export const CAMPOREE_SUPPLIES_CONFIGURE = "camporee-supplies:configure" satisfies PermissionKey;
export const CAMPOREE_SUPPLIES_REVIEW_PAY = "camporee-supplies:review-pay" satisfies PermissionKey;
export const CAMPOREE_SUPPLIES_DELIVER = "camporee-supplies:deliver" satisfies PermissionKey;

// Agrupación por pantalla: ver `src/lib/auth/screen-catalog/` (groupByScreen).
// El antiguo PERMISSION_GROUPS (por módulo) se retiró en 2026-09-15: no tenía consumidores.

// Union de claves válidas, tomada del catálogo generado.
export type { PermissionKey };

// ═══════════════════════════════════════════════════════════════════════════
// i18n helpers — use these in all UI components instead of hardcoded strings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * next-intl `useTranslations("rbac")` is not assignable to `(key: string) =>
 * string` because message keys are branded. Accept the runtime translator
 * structurally and call it with dynamic permission keys.
 */
type RbacTranslator = object;

function asRbacTranslator(t: RbacTranslator): {
  (key: string): string;
  has?: (key: string) => boolean;
} {
  return t as {
    (key: string): string;
    has?: (key: string) => boolean;
  };
}

function readRbacMessage(t: RbacTranslator, key: string): string | null {
  const translator = asRbacTranslator(t);
  if (typeof translator.has === "function" && !translator.has(key)) {
    return null;
  }
  try {
    const label = translator(key);
    if (!label || label === key) {
      return null;
    }
    return label;
  } catch {
    return null;
  }
}

/**
 * Returns the localised label for a permission key.
 * Looks up `rbac.permissions.<key>` in the active locale.
 * Messages store literal colon keys (`users:read`), not nested dots.
 * Falls back to the raw key string when no translation exists.
 *
 * @example
 *   const t = useTranslations("rbac");
 *   getPermissionLabel(t, "clubs:read") // → "Ver clubes" (es)
 */
export function getPermissionLabel(
  t: RbacTranslator,
  permissionKey: string,
): string {
  const colonKey = `permissions.${permissionKey}`;
  const dottedKey = `permissions.${permissionKey.replaceAll(":", ".")}`;
  return (
    readRbacMessage(t, colonKey) ??
    readRbacMessage(t, dottedKey) ??
    permissionKey
  );
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
  t: RbacTranslator,
  groupKey: string,
): string {
  return readRbacMessage(t, `permissionGroups.${groupKey}`) ?? groupKey;
}

export function permissionMatchesQuery(
  t: RbacTranslator,
  permission: {
    permission_name: string;
    description?: string | null;
  },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = getPermissionLabel(t, permission.permission_name).toLowerCase();
  const name = permission.permission_name.toLowerCase();
  const desc = (permission.description ?? "").toLowerCase();
  const resource = permission.permission_name.split(":")[0] ?? "";
  const group = getPermissionGroupLabel(t, resource).toLowerCase();
  return (
    label.includes(q) ||
    name.includes(q) ||
    desc.includes(q) ||
    group.includes(q)
  );
}
