import type { NavAccess } from "@/navigation/sidebar/nav-access";

export type { NavAccess };

export type ScreenSurface = "admin" | "app";

export type ScreenCapabilityKind = "button" | "tab" | "route" | "section";

/**
 * Gate of a capability. `roles` are expanded with the backend alias table
 * (`GlobalRolesGuard`) unless `exactRoles` is set — use `exactRoles: true`
 * only when the rule lives in a *service* that compares `role_name` literally
 * (e.g. director designation), never for `@GlobalRoles`.
 */
export type CapabilityGate = NavAccess & {
  exactRoles?: boolean;
};

/**
 * One verb the operator can perform inside a screen. `gate` mirrors the API
 * contract of the endpoint behind the verb: `permissions` from
 * `@RequirePermissions`, `roles` from the effective `@GlobalRoles` (method
 * overrides class). Never invent keys here — if the API has no key for the
 * verb, the verb is not declared.
 */
export type ScreenCapability = {
  /** Stable id, unique inside the screen: "create", "bulk_create", "health.read" */
  id: string;
  kind: ScreenCapabilityKind;
  gate: CapabilityGate;
  /**
   * Only for `kind: "route"`. Dashboard URL (exact or prefix) whose page gate
   * is this capability instead of the parent screen `viewAny`.
   */
  href?: string;
};

export type ScreenDefinition = {
  /** Equals the sidebar nav item id. */
  id: string;
  /**
   * Dashboard URL. Omit to reuse the sidebar url of the nav item with the
   * same id (the sidebar stays the single owner of URLs).
   */
  path?: string;
  /** `nav.items.*` key for a localised title. Falls back to the sidebar title. */
  titleKey?: string;
  surfaces: ScreenSurface[];
  /** Enter the screen / see it in the sidebar. Verbs never imply this. */
  viewAny: NavAccess;
  capabilities: ScreenCapability[];
};

/** Resolved subject used by every evaluator (server and client). */
export type AccessSubject = {
  permissions: ReadonlySet<string>;
  roles: ReadonlySet<string>;
  isSuperAdmin: boolean;
};
