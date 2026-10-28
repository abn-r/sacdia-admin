/**
 * Human labels for audit rows written by the backend's HTTP interceptor.
 *
 * That interceptor stores `summary = "<METHOD> <path>"` (ids that look like
 * tokens are replaced with `[REDACTED]`), `entity_type` = first path segment
 * (`admin`) and `entity_id` = the route's deepest/`id` param. None of that is
 * readable, so known RBAC routes are mapped to message keys here. Rows written
 * by services (richer summaries) or routes not listed fall through untouched
 * (`null`) and keep showing the raw values.
 */

export type AuditRouteKey =
  | "permissionCreated"
  | "permissionUpdated"
  | "permissionDeactivated"
  | "roleCreated"
  | "roleUpdated"
  | "roleDeactivated"
  | "rolePermissionsAdded"
  | "rolePermissionsReplaced"
  | "rolePermissionRemoved"
  | "userPermissionGranted"
  | "userPermissionRemoved"
  | "userRoleAssigned"
  | "userRoleRemoved"
  | "adminBootstrapped";

/** What `entity_id` points at for that route (the id the interceptor recorded). */
export type AuditEntityKind = "role" | "permission" | "user";

export type AuditRouteInfo = {
  routeKey: AuditRouteKey;
  entityKind: AuditEntityKind;
  /** DELETE that only deactivates the record: show "Desactivado", not "Eliminado". */
  softDelete: boolean;
};

type Rule = {
  methods: readonly string[];
  /** Segments after `api/v1`; `:x` matches any single segment. */
  path: string;
  info: AuditRouteInfo;
};

const rule = (
  methods: readonly string[],
  path: string,
  routeKey: AuditRouteKey,
  entityKind: AuditEntityKind,
  softDelete = false,
): Rule => ({ methods, path, info: { routeKey, entityKind, softDelete } });

const RULES: readonly Rule[] = [
  rule(["POST"], "admin/rbac/permissions", "permissionCreated", "permission"),
  rule(["PATCH", "PUT"], "admin/rbac/permissions/:id", "permissionUpdated", "permission"),
  rule(["DELETE"], "admin/rbac/permissions/:id", "permissionDeactivated", "permission", true),
  rule(["POST"], "admin/rbac/roles", "roleCreated", "role"),
  rule(["PATCH", "PUT"], "admin/rbac/roles/:id", "roleUpdated", "role"),
  rule(["DELETE"], "admin/rbac/roles/:id", "roleDeactivated", "role", true),
  rule(["POST"], "admin/rbac/roles/:id/permissions", "rolePermissionsAdded", "role"),
  rule(["PUT"], "admin/rbac/roles/:id/permissions", "rolePermissionsReplaced", "role"),
  rule(["DELETE"], "admin/rbac/roles/:id/permissions/:permissionId", "rolePermissionRemoved", "role"),
  rule(["POST"], "admin/rbac/users/:userId/permissions", "userPermissionGranted", "user"),
  rule(["DELETE"], "admin/rbac/users/:userId/permissions/:permissionId", "userPermissionRemoved", "permission"),
  rule(["POST"], "admin/rbac/users/:userId/roles", "userRoleAssigned", "user"),
  rule(["DELETE"], "admin/rbac/users/:userId/roles/:roleId", "userRoleRemoved", "role"),
  rule(["POST"], "admin/rbac/bootstrap-admin", "adminBootstrapped", "user"),
];

const SUMMARY_PATTERN = /^([A-Z]+)\s+(\S+)$/;

function routeSegments(path: string): string[] {
  return (path.split("?")[0] ?? "")
    .split("/")
    .filter(Boolean)
    .filter((segment, index) => !(index === 0 && segment === "api") && !/^v\d+$/.test(segment));
}

function matches(pattern: string, segments: string[]): boolean {
  const expected = pattern.split("/");
  return (
    expected.length === segments.length &&
    expected.every((part, index) => part.startsWith(":") || part === segments[index])
  );
}

/**
 * `method`/`path` come from `request_context` when the detail was loaded;
 * otherwise they are parsed out of the list row's `summary`.
 */
export function describeAuditRoute(input: {
  summary?: string | null;
  request_context?: Record<string, unknown> | null;
}): AuditRouteInfo | null {
  let method: string | null = null;
  let path: string | null = null;

  const parsed = input.summary ? SUMMARY_PATTERN.exec(input.summary.trim()) : null;
  if (parsed) {
    method = parsed[1] ?? null;
    path = parsed[2] ?? null;
  } else if (input.request_context) {
    const { method: ctxMethod, path: ctxPath } = input.request_context;
    if (typeof ctxMethod === "string" && typeof ctxPath === "string") {
      method = ctxMethod.toUpperCase();
      path = ctxPath;
    }
  }
  if (!method || !path) return null;

  const segments = routeSegments(path);
  const found = RULES.find(
    (candidate) => candidate.methods.includes(method) && matches(candidate.path, segments),
  );
  return found ? found.info : null;
}

/** First 8 characters of a UUID-ish id, enough to tell rows apart in a list. */
export function shortAuditId(id: string): string {
  const trimmed = id.trim();
  return trimmed.length > 8 ? `${trimmed.slice(0, 8)}…` : trimmed;
}
