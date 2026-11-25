/**
 * URL contract and action semantics of the audit log screen.
 *
 * The backend stores only `CREATED | UPDATED | DELETED` (plus domain actions
 * such as `AUTHORIZATION_DENIED`) and filters by that exact value. Session
 * events (`POST auth/login`, `auth/logout`) are stored as `CREATED`, and a
 * soft deactivation as `DELETED`; the admin tells them apart from the route
 * (`describeAuditRoute`). So the filters below narrow on the server as far as
 * the API allows and finish the job on the client.
 */

import type { AdminAuditLogItem, AdminAuditLogListQuery } from "@/lib/api/audit-logs";
import { describeAuditRoute } from "@/lib/audit/describe-audit-route";

export const AUDIT_ACTION_FILTERS = [
  "created",
  "updated",
  "deleted",
  "deactivated",
  "login",
  "logout",
  "denied",
] as const;
export type AuditActionFilter = (typeof AUDIT_ACTION_FILTERS)[number];

export const AUDIT_RESULT_FILTERS = ["succeeded", "failed"] as const;
export type AuditResultFilter = (typeof AUDIT_RESULT_FILTERS)[number];

export type AuditFilters = {
  q?: string;
  action?: AuditActionFilter;
  result?: AuditResultFilter;
  /** `yyyy-mm-dd`, inclusive. */
  from?: string;
  /** `yyyy-mm-dd`, inclusive. */
  to?: string;
};

type RawParams = Record<string, string | string[] | undefined> | URLSearchParams;

function read(params: RawParams, key: string): string | undefined {
  const raw =
    params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseAuditFilters(params: RawParams): AuditFilters {
  const q = read(params, "q");
  const action = read(params, "action");
  const result = read(params, "result");
  const from = read(params, "from");
  const to = read(params, "to");
  return {
    ...(q ? { q: q.slice(0, 100) } : {}),
    ...(action && (AUDIT_ACTION_FILTERS as readonly string[]).includes(action)
      ? { action: action as AuditActionFilter }
      : {}),
    ...(result && (AUDIT_RESULT_FILTERS as readonly string[]).includes(result)
      ? { result: result as AuditResultFilter }
      : {}),
    ...(from && DATE_ONLY.test(from) ? { from } : {}),
    ...(to && DATE_ONLY.test(to) ? { to } : {}),
  };
}

/** Query string (without `?`) for the filters; empty when none is set. */
export function auditFiltersToSearch(filters: AuditFilters): string {
  const qs = new URLSearchParams();
  if (filters.q) qs.set("q", filters.q);
  if (filters.action) qs.set("action", filters.action);
  if (filters.result) qs.set("result", filters.result);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  return qs.toString();
}

/** What the API can filter by. `q` is never sent (the API has no free-text search). */
export function auditServerQuery(filters: AuditFilters): AdminAuditLogListQuery {
  const query: AdminAuditLogListQuery = {};
  switch (filters.action) {
    case "created":
      query.action = "CREATED";
      break;
    case "updated":
      query.action = "UPDATED";
      break;
    case "deleted":
    case "deactivated":
      query.action = "DELETED";
      break;
    case "login":
    case "logout":
      query.action = "CREATED";
      query.entity_type = "auth";
      break;
    case "denied":
      query.action = "AUTHORIZATION_DENIED";
      break;
    default:
      break;
  }
  if (filters.result) query.result = filters.result;
  if (filters.from) query.from = filters.from;
  if (filters.to) query.to = filters.to;
  return query;
}

/** True when the server filter alone is not enough and rows must be checked on the client. */
export function auditNeedsClientActionFilter(action: AuditActionFilter | undefined): boolean {
  return (
    action === "created" ||
    action === "deleted" ||
    action === "deactivated" ||
    action === "login" ||
    action === "logout"
  );
}

export function matchesAuditAction(
  item: Pick<AdminAuditLogItem, "summary" | "action">,
  filter: AuditActionFilter | undefined,
): boolean {
  if (!filter) return true;
  const route = describeAuditRoute({ summary: item.summary });
  switch (filter) {
    case "login":
      return route?.action === "LOGIN";
    case "logout":
      return route?.action === "LOGOUT";
    case "deactivated":
      return item.action === "DELETED" && route?.softDelete === true;
    case "deleted":
      return item.action === "DELETED" && route?.softDelete !== true;
    case "created":
      return item.action === "CREATED" && !route?.action;
    case "updated":
      return item.action === "UPDATED";
    case "denied":
      return item.action === "AUTHORIZATION_DENIED";
  }
}

/** Free-text match over the readable fields of a row (accent and case insensitive). */
export function matchesAuditSearch(fields: ReadonlyArray<string | null | undefined>, q: string | undefined): boolean {
  const needle = normalize(q ?? "");
  if (!needle) return true;
  return fields.some((field) => field && normalize(field).includes(needle));
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
