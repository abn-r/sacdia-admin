/**
 * URL contract of Roles y permisos: one entry, tab in `?tab=`, selected role of
 * "Por rol" in `?role=`. Pure helpers so the server page, the client pieces and
 * the legacy redirects (`/matrix`, `/permissions`, `/rbac/user-permissions`) agree.
 */

export const ROLES_TABS = ["roles", "by-role", "catalog", "direct"] as const;
export type RolesTab = (typeof ROLES_TABS)[number];
export const DEFAULT_ROLES_TAB: RolesTab = "roles";

export const ROLES_BASE_PATH = "/dashboard/configuration/roles";

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** Tab the user asked for, if it is one they can see; otherwise the first visible one. */
export function resolveRolesTab(
  requested: string | string[] | undefined,
  visible: readonly RolesTab[],
): RolesTab | null {
  const v = first(requested);
  if (v && (visible as readonly string[]).includes(v)) return v as RolesTab;
  return visible[0] ?? null;
}

export type RolesHrefOptions = {
  /** Selected role of the "Por rol" tab. */
  role?: string;
  /** Catalog pagination. */
  page?: number;
  limit?: number;
};

/** The first visible tab is the default of the page, so it carries no `?tab=`. */
export function buildRolesHref(
  tab: RolesTab,
  options: RolesHrefOptions = {},
  /** Tab that needs no `?tab=`; `null` always writes it (redirect targets). */
  defaultTab: RolesTab | null = DEFAULT_ROLES_TAB,
): string {
  const qs = new URLSearchParams();
  if (tab !== defaultTab) qs.set("tab", tab);
  if (tab === "by-role" && options.role) qs.set("role", options.role);
  if (tab === "catalog") {
    if (options.page && options.page > 1) qs.set("page", String(options.page));
    if (options.limit && options.limit !== 20) qs.set("limit", String(options.limit));
  }
  const s = qs.toString();
  return s ? `${ROLES_BASE_PATH}?${s}` : ROLES_BASE_PATH;
}

function positiveInt(value: string | string[] | undefined): number | undefined {
  const n = Number.parseInt(first(value) ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : undefined;
}

/**
 * Redirect targets are always explicit (`?tab=…`): the default tab depends on
 * the viewer's permissions, so the target cannot rely on it.
 */
function explicit(tab: RolesTab, options: RolesHrefOptions = {}): string {
  return buildRolesHref(tab, options, null);
}

/** `/dashboard/configuration/matrix[?role=<id>]` -> "Por rol" tab. */
export function legacyMatrixHref(params: RawParams): string {
  const role = first(params.role) ?? first(params.roleId);
  return explicit("by-role", role ? { role } : {});
}

/** `/dashboard/configuration/permissions[?page=&limit=]` -> catalog tab. */
export function legacyPermissionsHref(params: RawParams): string {
  const page = positiveInt(params.page);
  const limit = positiveInt(params.limit);
  return explicit("catalog", {
    ...(page ? { page } : {}),
    ...(limit ? { limit } : {}),
  });
}

/** `/dashboard/rbac/user-permissions` -> direct permissions tab. */
export function legacyUserPermissionsHref(): string {
  return explicit("direct");
}
