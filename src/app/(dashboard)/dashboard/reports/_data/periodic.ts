import type { AnnualReportsSearchParams } from "@/components/periodic-reports/annual-reports-list-client";
import type { QuarterlyReportsSearchParams } from "@/components/periodic-reports/quarterly-reports-list-client";
import { errorStateFromError, type ErrorStateFromError } from "@/lib/api/error-state";
import {
  listAdminAnnualReports,
  listAdminQuarterlyReports,
  parsePeriodicReportStatus,
  type AdminAnnualReport,
  type AdminQuarterlyReport,
  type PeriodicReportsPage,
} from "@/lib/api/reports";
import { parsePositiveInt } from "@/lib/report-search-params";

const DEFAULT_LIMIT = 20;

type Query = Record<string, string | string[] | undefined>;

function str(value: number | undefined): string | undefined {
  return value ? String(value) : undefined;
}

export interface PeriodicView<TReport, TSearch> {
  data: PeriodicReportsPage<TReport> | null;
  error: ErrorStateFromError | null;
  searchParams: TSearch;
}

export async function loadQuarterly(
  query: Query,
): Promise<PeriodicView<AdminQuarterlyReport, QuarterlyReportsSearchParams>> {
  const quarter = parsePositiveInt(query.quarter);
  const filters = {
    clubId: parsePositiveInt(query.club_id),
    year: parsePositiveInt(query.year),
    quarter: quarter && quarter <= 4 ? quarter : undefined,
    status: parsePeriodicReportStatus(Array.isArray(query.status) ? query.status[0] : query.status),
    page: parsePositiveInt(query.page) ?? 1,
    limit: parsePositiveInt(query.limit) ?? DEFAULT_LIMIT,
  };
  const searchParams: QuarterlyReportsSearchParams = {
    club_id: str(filters.clubId),
    year: str(filters.year),
    quarter: str(filters.quarter),
    status: filters.status,
    limit: query.limit ? String(filters.limit) : undefined,
  };

  try {
    return { data: await listAdminQuarterlyReports(filters), error: null, searchParams };
  } catch (error) {
    console.error("[ReportsPage] Failed to load quarterly reports:", error);
    return { data: null, error: errorStateFromError(error), searchParams };
  }
}

export async function loadAnnual(
  query: Query,
): Promise<PeriodicView<AdminAnnualReport, AnnualReportsSearchParams>> {
  const filters = {
    clubId: parsePositiveInt(query.club_id),
    ecclesiasticalYearId: parsePositiveInt(query.ecclesiastical_year_id),
    status: parsePeriodicReportStatus(Array.isArray(query.status) ? query.status[0] : query.status),
    page: parsePositiveInt(query.page) ?? 1,
    limit: parsePositiveInt(query.limit) ?? DEFAULT_LIMIT,
  };
  const searchParams: AnnualReportsSearchParams = {
    club_id: str(filters.clubId),
    ecclesiastical_year_id: str(filters.ecclesiasticalYearId),
    status: filters.status,
    limit: query.limit ? String(filters.limit) : undefined,
  };

  try {
    return { data: await listAdminAnnualReports(filters), error: null, searchParams };
  } catch (error) {
    console.error("[ReportsPage] Failed to load annual reports:", error);
    return { data: null, error: errorStateFromError(error), searchParams };
  }
}
