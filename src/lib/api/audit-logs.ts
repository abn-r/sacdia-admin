import { apiRequestFromClient } from "@/lib/api/client";

export type AuditAction = "CREATED" | "UPDATED" | "DELETED" | (string & {});

export type AuditActor = {
  user_id: string;
  name: string | null;
  paternal_last_name: string | null;
};

export type AdminAuditLogItem = {
  audit_log_id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  result?: string;
  source?: "http" | "service" | string;
  summary: string | null;
  club_id?: number | null;
  correlation_id?: string | null;
  actor: AuditActor | null;
  created_at: string;
};

export type AdminAuditLogDetail = AdminAuditLogItem & {
  changes?: Record<string, unknown> | null;
  request_context?: Record<string, unknown> | null;
};

export type AdminAuditLogPage = {
  items: AdminAuditLogItem[];
  next_cursor: string | null;
};

export type AdminAuditLogListQuery = {
  entity_type?: string;
  actor_user_id?: string;
  action?: string;
  result?: string;
  source?: string;
  club_id?: number;
  correlation_id?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string | null;
};

function unwrap<T>(payload: unknown): T {
  const wrapped = payload as { data?: T } | T;
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "data" in (wrapped as Record<string, unknown>) &&
    (wrapped as { data?: T }).data
  ) {
    return (wrapped as { data: T }).data;
  }
  return wrapped as T;
}

export function buildAdminAuditLogsPath(
  opts: AdminAuditLogListQuery = {},
): string {
  const params = new URLSearchParams();
  if (opts.entity_type) params.set("entity_type", opts.entity_type);
  if (opts.actor_user_id) params.set("actor_user_id", opts.actor_user_id);
  if (opts.action) params.set("action", opts.action);
  if (opts.result) params.set("result", opts.result);
  if (opts.source) params.set("source", opts.source);
  if (opts.club_id !== undefined) params.set("club_id", String(opts.club_id));
  if (opts.correlation_id) params.set("correlation_id", opts.correlation_id);
  if (opts.from) params.set("from", opts.from);
  if (opts.to) params.set("to", opts.to);
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.cursor) params.set("cursor", opts.cursor);
  const qs = params.toString();
  return `/admin/audit-logs${qs ? `?${qs}` : ""}`;
}

export async function listAdminAuditLogs(
  opts: AdminAuditLogListQuery = {},
): Promise<AdminAuditLogPage> {
  const payload = await apiRequestFromClient<unknown>(
    buildAdminAuditLogsPath(opts),
  );
  return unwrap<AdminAuditLogPage>(payload);
}

export async function getAdminAuditLog(
  auditLogId: string,
): Promise<AdminAuditLogDetail> {
  const payload = await apiRequestFromClient<unknown>(
    `/admin/audit-logs/${encodeURIComponent(auditLogId)}`,
  );
  return unwrap<AdminAuditLogDetail>(payload);
}

export function formatAuditActorName(actor: AuditActor | null): string | null {
  if (!actor) return null;
  const parts = [actor.name, actor.paternal_last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}
