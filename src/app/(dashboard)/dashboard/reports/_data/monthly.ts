import type { ScopeOption } from "@/components/shared/scope-picker";
import type { MonthlyTerritorySearchParams } from "@/components/reports/monthly-territory-list";
import type { MonthlyClubSearchParams } from "@/components/reports/monthly-club-list";
import { listClubTypes, type ClubType } from "@/lib/api/catalogs";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import { getClubEnrollmentId, getCurrentClubEnrollment } from "@/lib/api/club-enrollments";
import { listDivisions } from "@/lib/api/geography";
import {
  listAdminReports,
  listMonthlyReports,
  type AdminReportFilters,
  type AdminReportsPage,
  type MonthlyReport,
} from "@/lib/api/monthly-reports";
import { resolveActiveClubContext } from "@/lib/auth/club-context";
import {
  applyTerritoryToReportSearchParams,
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import { parsePositiveInt } from "@/lib/report-search-params";
import { encodeReportScope } from "@/lib/reports/scope";
import { parseMonthlyStatus, type PendingCounts } from "@/lib/reports/status";

const LIMITS = [20, 50, 100];
const DEFAULT_LIMIT = 20;

type Query = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value) || undefined;
}

function positiveParam(value: string | string[] | undefined): string | undefined {
  const parsed = parsePositiveInt(value);
  return parsed ? String(parsed) : undefined;
}

// ─── Territory roles: the reports of their scope ──────────────────────────────

export interface TerritoryMonthlyView {
  data: AdminReportsPage | null;
  error: ErrorStateFromError | null;
  clubTypes: ClubType[];
  /** Raw choices from the URL (the territory is applied to the API call only). */
  searchParams: MonthlyTerritorySearchParams;
  scopeOptions: ScopeOption[];
  /** Drafts and to-send reports for the same scope and period; null when unknown. */
  counts: PendingCounts | null;
}

export interface TerritoryGroupLabels {
  division: string;
  union: string;
  localField: string;
}

export async function loadTerritoryMonthly(
  user: AuthUser,
  query: Query,
  currentYear: number,
  groups: TerritoryGroupLabels,
): Promise<TerritoryMonthlyView> {
  const territory = resolveAdminTerritoryScope(user);

  const raw: MonthlyTerritorySearchParams = {
    division_id: positiveParam(query.division_id),
    union_id: positiveParam(query.union_id),
    local_field_id: positiveParam(query.local_field_id),
    club_type_id: positiveParam(query.club_type_id),
    year: positiveParam(query.year),
    month: positiveParam(query.month),
    status: parseMonthlyStatus(query.status),
    page: positiveParam(query.page),
    limit: positiveParam(query.limit),
  };
  const applied = applyTerritoryToReportSearchParams(raw, territory);
  const limit = LIMITS.includes(Number(raw.limit)) ? Number(raw.limit) : DEFAULT_LIMIT;

  const base: AdminReportFilters = {
    ...(applied.division_id ? { divisionId: Number(applied.division_id) } : {}),
    ...(applied.union_id ? { unionId: Number(applied.union_id) } : {}),
    ...(applied.local_field_id ? { localFieldId: Number(applied.local_field_id) } : {}),
    ...(applied.club_type_id ? { clubTypeId: Number(applied.club_type_id) } : {}),
    year: applied.year ? Number(applied.year) : currentYear,
    ...(applied.month ? { month: Number(applied.month) } : {}),
  };

  const wantsDivisions = territory.level === "all";
  const wantsUnions = territory.level === "all" || territory.level === "division";
  const wantsFields = territory.level !== "local_field";

  const [clubTypes, divisions, unions, localFields, listed] = await Promise.all([
    listClubTypes().catch((): ClubType[] => []),
    wantsDivisions ? listDivisions().catch(() => []) : Promise.resolve([]),
    wantsUnions ? listUnionsForTerritory(user).catch(() => []) : Promise.resolve([]),
    wantsFields ? listLocalFieldsForTerritory(user).catch(() => []) : Promise.resolve([]),
    listAdminReports({
      ...base,
      ...(applied.status ? { status: applied.status } : {}),
      page: raw.page ? Number(raw.page) : 1,
      limit,
    }).then(
      (data) => ({ ok: true as const, data }),
      (error: unknown) => {
        console.error("[ReportsPage] Failed to load the territory reports:", error);
        return { ok: false as const, error };
      },
    ),
  ]);

  const scopeOptions: ScopeOption[] = [
    ...divisions.map((d) => ({
      id: encodeReportScope("division", d.division_id),
      name: d.name,
      group: groups.division,
    })),
    ...unions.map((u) => ({ id: encodeReportScope("union", u.union_id), name: u.name, group: groups.union })),
    ...localFields.map((f) => ({
      id: encodeReportScope("local_field", f.local_field_id),
      name: f.name,
      group: groups.localField,
    })),
  ];

  let counts: PendingCounts | null = null;
  if (listed.ok) {
    const totalOf = (status: "draft" | "generated") =>
      listAdminReports({ ...base, status, page: 1, limit: 1 }).then((page) => page.total);
    counts = await Promise.all([totalOf("draft"), totalOf("generated")]).then(
      ([drafts, toSend]) => ({ drafts, toSend }),
      () => null,
    );
  }

  return {
    data: listed.ok ? listed.data : null,
    error: listed.ok ? null : errorStateFromError(listed.error),
    clubTypes,
    searchParams: { ...raw, ...(raw.limit ? { limit: String(limit) } : {}) },
    scopeOptions,
    counts,
  };
}

// ─── Club roles: their own club's reports ─────────────────────────────────────

export type ClubMonthlyView =
  | {
      kind: "ready";
      enrollmentId: string | number;
      reports: MonthlyReport[] | null;
      error: ErrorStateFromError | null;
      searchParams: MonthlyClubSearchParams;
      clubLabel: string | null;
      /** Every report of the club, before the year/status filters (drives the finding). */
      all: MonthlyReport[] | null;
    }
  | { kind: "no-enrollment"; error: ErrorStateFromError | null };

export async function loadClubMonthly(user: AuthUser, query: Query, currentYear: number): Promise<ClubMonthlyView> {
  const context = resolveActiveClubContext(user);
  if (!context) return { kind: "no-enrollment", error: null };

  let enrollmentId: string | number | null = null;
  try {
    enrollmentId = getClubEnrollmentId(await getCurrentClubEnrollment(context.clubId, context.sectionId));
  } catch (error) {
    const state = errorStateFromError(error);
    // A missing enrollment is an expected state, not a failure.
    if (state.kind !== "notFound") return { kind: "no-enrollment", error: state };
  }
  if (!enrollmentId) return { kind: "no-enrollment", error: null };

  const yearRaw = first(query.year);
  const year = yearRaw === "all" ? "all" : (positiveParam(yearRaw) ?? String(currentYear));
  const status = parseMonthlyStatus(query.status);

  let all: MonthlyReport[] | null = null;
  let error: ErrorStateFromError | null = null;
  try {
    all = await listMonthlyReports(enrollmentId);
  } catch (caught) {
    console.error("[ReportsPage] Failed to load the club reports:", caught);
    error = errorStateFromError(caught);
  }

  const reports = all
    ? all
        .filter((r) => (year === "all" ? true : r.year === Number(year)) && (status ? r.status === status : true))
        .sort((a, b) => b.year - a.year || b.month - a.month)
    : null;
  const clubLabel =
    context.clubName && context.clubType
      ? `${context.clubName} (${context.clubType})`
      : (context.clubName ?? context.clubType ?? null);

  return {
    kind: "ready",
    enrollmentId,
    reports,
    error,
    searchParams: { year, ...(status ? { status } : {}) },
    clubLabel,
    all,
  };
}
