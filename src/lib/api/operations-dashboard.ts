import { apiRequest } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

// ─── Types (aligned with backend DTO) ─────────────────────────────────────────

export type ScopeLevel = "all" | "division" | "union" | "local_field";
export type ChildLevel = "division" | "union" | "local_field" | "club";
export type MetricQuality =
  | "exact"
  | "current_affiliation"
  | "unavailable"
  | "not_applicable";
export type HonorsAttribution = "current_affiliation" | "unavailable";

export type OperationsDashboardScopePathNode = {
  level: Exclude<ScopeLevel, "all">;
  id: number;
  name: string;
};

export type OperationsDashboardScope = {
  level: ScopeLevel;
  id: number | null;
  name: string;
  path: OperationsDashboardScopePathNode[];
};

export type EcclesiasticalYearPeriod = {
  id: number;
  start_date: string;
  end_date: string;
  active: boolean;
};

export type ReportingMonthPeriod = {
  year: number;
  month: number;
};

export type OperationsDashboardPeriod = {
  ecclesiastical_year: EcclesiasticalYearPeriod;
  reporting_month: ReportingMonthPeriod | null;
};

export type OperationsDashboardMeta = {
  computed_at: string;
  cached: boolean;
  cache_ttl_seconds: number;
  definitions_version: string;
  scope: OperationsDashboardScope;
  period: OperationsDashboardPeriod;
};

export type AdministrativeClubsMetrics = {
  total: number;
  active: number;
  inactive: number;
};

export type OperationsMetrics = {
  operational_clubs: number;
  non_operational_clubs: number;
  operational_sections: number;
  operational_rate_pct: number | null;
};

export type PlatformAccountsMetrics = {
  active: number;
  inactive: number;
};

export type PeopleMetrics = {
  institutionally_active: number;
  platform_accounts: PlatformAccountsMetrics;
};

export type ClassBreakdownItem = {
  class_id: number;
  class_name: string;
  club_type_id: number;
  club_type_name: string;
  display_order: number;
  enrollment_count: number;
};

export type ClassesMetrics = {
  total_enrollments: number;
  distinct_people: number;
  by_class: ClassBreakdownItem[];
};

export type MonthlyReportsMetrics = {
  expected_sections: number;
  submitted_sections: number;
  draft_sections: number;
  generated_sections: number;
  missing_sections: number;
  coverage_pct: number | null;
};

export type HonorsMetrics = {
  in_progress: number | null;
  pending_review: number | null;
  approved: number | null;
  attribution: HonorsAttribution;
};

export type ActivitiesMetrics = {
  registered: number;
  joint_registered: number;
  distinct_participating_sections: number;
};

export type QueuesMetrics = {
  role_assignments_pending: number;
  transfers_pending: number;
  class_validations_pending: number;
  honors_review_pending: number | null;
  annual_folders_pending_union: number;
};

export type DashboardMetrics = {
  administrative_clubs: AdministrativeClubsMetrics;
  operations: OperationsMetrics;
  people: PeopleMetrics;
  classes: ClassesMetrics;
  monthly_reports: MonthlyReportsMetrics;
  honors: HonorsMetrics;
  activities: ActivitiesMetrics;
  queues: QueuesMetrics;
};

export type OperationsDashboardChild = {
  id: number;
  name: string;
  level: ChildLevel;
} & DashboardMetrics;

export type OperationsDashboardDataQuality = {
  metric: string;
  status: MetricQuality;
  note: string;
};

export type OperationsDashboardData = {
  meta: OperationsDashboardMeta;
  summary: DashboardMetrics;
  children: OperationsDashboardChild[];
  data_quality: OperationsDashboardDataQuality[];
};

export type OperationsDashboardQuery = {
  ecclesiastical_year_id?: number;
  division_id?: number;
  union_id?: number;
  local_field_id?: number;
  report_year?: number;
  report_month?: number;
};

// ─── Query helpers ────────────────────────────────────────────────────────────

export function isValidPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && !Number.isNaN(value);
}

function parsePositiveIntParam(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

export function parseOperationsDashboardSearchParams(
  raw: Record<string, string | string[] | undefined>,
): OperationsDashboardQuery {
  const query: OperationsDashboardQuery = {};

  const ecclesiasticalYearId = parsePositiveIntParam(raw.ecclesiastical_year_id);
  if (ecclesiasticalYearId !== undefined) {
    query.ecclesiastical_year_id = ecclesiasticalYearId;
  }

  const divisionId = parsePositiveIntParam(raw.division_id);
  if (divisionId !== undefined) {
    query.division_id = divisionId;
  }

  const unionId = parsePositiveIntParam(raw.union_id);
  if (unionId !== undefined) {
    query.union_id = unionId;
  }

  const localFieldId = parsePositiveIntParam(raw.local_field_id);
  if (localFieldId !== undefined) {
    query.local_field_id = localFieldId;
  }

  const reportYear = parsePositiveIntParam(raw.report_year);
  const reportMonth = parsePositiveIntParam(raw.report_month);
  if (reportYear !== undefined && reportMonth !== undefined) {
    query.report_year = reportYear;
    query.report_month = reportMonth;
  }

  return query;
}

export function serializeOperationsDashboardParams(
  query: OperationsDashboardQuery,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (isValidPositiveInt(query.ecclesiastical_year_id)) {
    params.ecclesiastical_year_id = query.ecclesiastical_year_id;
  }

  if (isValidPositiveInt(query.division_id)) {
    params.division_id = query.division_id;
  }

  if (isValidPositiveInt(query.union_id)) {
    params.union_id = query.union_id;
  }

  if (isValidPositiveInt(query.local_field_id)) {
    params.local_field_id = query.local_field_id;
  }

  const hasYear = isValidPositiveInt(query.report_year);
  const hasMonth = isValidPositiveInt(query.report_month);
  if (hasYear && hasMonth) {
    params.report_year = query.report_year!;
    params.report_month = query.report_month!;
  }

  return params;
}

export function buildDrillDownQuery(
  child: Pick<OperationsDashboardChild, "level" | "id">,
  currentQuery: OperationsDashboardQuery,
): OperationsDashboardQuery {
  const period = preservePeriodParams(currentQuery);

  switch (child.level) {
    case "division":
      return { ...period, division_id: child.id };
    case "union":
      return { ...period, union_id: child.id };
    case "local_field":
      return { ...period, local_field_id: child.id };
    case "club":
      return period;
    default:
      return period;
  }
}

export function buildResetScopeQuery(currentQuery: OperationsDashboardQuery): OperationsDashboardQuery {
  return preservePeriodParams(currentQuery);
}

function preservePeriodParams(
  currentQuery: OperationsDashboardQuery,
): OperationsDashboardQuery {
  const result: OperationsDashboardQuery = {};

  if (isValidPositiveInt(currentQuery.ecclesiastical_year_id)) {
    result.ecclesiastical_year_id = currentQuery.ecclesiastical_year_id;
  }

  if (
    isValidPositiveInt(currentQuery.report_year) &&
    isValidPositiveInt(currentQuery.report_month)
  ) {
    result.report_year = currentQuery.report_year;
    result.report_month = currentQuery.report_month;
  }

  return result;
}

export function buildDashboardHref(query: OperationsDashboardQuery): string {
  return buildDashboardPath("/dashboard", query);
}

export function buildDashboardV2Href(query: OperationsDashboardQuery): string {
  return buildDashboardPath("/dashboard/v2", query);
}

function buildDashboardPath(basePath: string, query: OperationsDashboardQuery): string {
  const params = serializeOperationsDashboardParams(query);
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function formatMetricCount(
  value: number | null | undefined,
  formatNumber: (n: number) => string,
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return formatNumber(value);
}

export function formatMetricPercent(
  value: number | null | undefined,
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string,
): string {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${formatNumber(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const OPERATIONS_DASHBOARD_PATH = "/admin/analytics/operations-dashboard";

export async function fetchOperationsDashboard(
  query: OperationsDashboardQuery = {},
): Promise<OperationsDashboardData> {
  const payload = await apiRequest<unknown>(OPERATIONS_DASHBOARD_PATH, {
    params: serializeOperationsDashboardParams(query),
    cache: "no-store",
  });

  return unwrapApiData<OperationsDashboardData>(payload);
}
