export type ReportScopeKind = "division" | "union" | "local_field";

export interface ReportScopeParams {
  division_id?: string;
  union_id?: string;
  local_field_id?: string;
}

export function encodeReportScope(kind: ReportScopeKind, id: number | string): string {
  return `${kind}:${id}`;
}

export function decodeReportScope(value: string): { kind: ReportScopeKind; id: string } | null {
  const [kind, id] = value.split(":");
  if (!id || !/^\d+$/.test(id)) return null;
  if (kind === "division" || kind === "union" || kind === "local_field") return { kind, id };
  return null;
}

/** The most specific scope in the URL: local field, then union, then division. */
export function currentReportScope(params: ReportScopeParams): string | undefined {
  if (params.local_field_id) return encodeReportScope("local_field", params.local_field_id);
  if (params.union_id) return encodeReportScope("union", params.union_id);
  if (params.division_id) return encodeReportScope("division", params.division_id);
  return undefined;
}

/** The URL params that pick `scope` (and clear the others); `null` clears all. */
export function reportScopeParams(scope: string | null): Required<Record<keyof ReportScopeParams, string | undefined>> {
  const cleared = { division_id: undefined, union_id: undefined, local_field_id: undefined };
  const decoded = scope ? decodeReportScope(scope) : null;
  if (!decoded) return cleared;
  if (decoded.kind === "division") return { ...cleared, division_id: decoded.id };
  if (decoded.kind === "union") return { ...cleared, union_id: decoded.id };
  return { ...cleared, local_field_id: decoded.id };
}
