import { ApiError } from "@/lib/api/client";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import {
  getInvestitureConfigs,
  getPendingInvestitures,
  getPipelineEnrollmentsForYear,
  type InvestitureConfig,
  type PendingEnrollment,
  type PendingEnrollmentsQuery,
  type PipelineEnrollment,
} from "@/lib/api/investiture";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import { listLocalFieldsForTerritory, resolveAdminTerritoryScope } from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
import type { UserRole } from "@/components/investiture/pipeline-table";

type GenericRecord = Record<string, unknown>;

export function extractEcclesiasticalYears(payload: unknown): EcclesiasticalYear[] {
  if (Array.isArray(payload)) return payload as EcclesiasticalYear[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as EcclesiasticalYear[];
  }
  return [];
}

export function resolveCurrentEcclesiasticalYear(
  years: EcclesiasticalYear[],
): EcclesiasticalYear | null {
  return (
    years.find((year) => year.active) ??
    [...years].sort((a, b) =>
      (b.start_date ?? "").localeCompare(a.start_date ?? ""),
    )[0] ??
    null
  );
}

export function resolveInitialYearId(years: EcclesiasticalYear[]): number | null {
  return (
    years.find((year) => year.active)?.ecclesiastical_year_id ??
    years[0]?.ecclesiastical_year_id ??
    null
  );
}

export function resolveInvestitureUserRole(roles: string[]): UserRole {
  const set = new Set(roles);
  if (set.has(SUPER_ADMIN_ROLE) || set.has("admin")) return "admin";
  if (set.has("coordinator")) return "coordinator";
  if (set.has("field")) return "field";
  return "director";
}

export function parseInvestitureSearchParams(
  raw: Record<string, string | string[] | undefined>,
): PendingEnrollmentsQuery {
  const yearRaw = raw.year;
  const parsedYear =
    typeof yearRaw === "string" && yearRaw.trim().length > 0
      ? Number(yearRaw)
      : undefined;

  return {
    page: 1,
    limit: 100,
    ...(Number.isFinite(parsedYear) ? { ecclesiastical_year_id: parsedYear } : {}),
  };
}

export async function loadEcclesiasticalYears(): Promise<EcclesiasticalYear[]> {
  const payload = await listEcclesiasticalYears();
  return extractEcclesiasticalYears(payload);
}

export type InvestiturePendingListResult = {
  enrollments: PendingEnrollment[];
  years: EcclesiasticalYear[];
  initialYearId: number | null;
  error: { message: string; status: number | null } | null;
};

export async function loadInvestiturePendingList(
  query: PendingEnrollmentsQuery = { page: 1, limit: 100 },
): Promise<InvestiturePendingListResult> {
  try {
    const years = await loadEcclesiasticalYears();
    const initialYearId =
      query.ecclesiastical_year_id ?? resolveInitialYearId(years);

    const pendingPayload = await getPendingInvestitures({
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      ...(initialYearId ? { ecclesiastical_year_id: initialYearId } : {}),
    });

    return {
      enrollments: Array.isArray(pendingPayload?.data) ? pendingPayload.data : [],
      years,
      initialYearId,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        enrollments: [],
        years: [],
        initialYearId: null,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      enrollments: [],
      years: [],
      initialYearId: null,
      error: { message: "", status: null },
    };
  }
}

export type InvestiturePipelineListResult = {
  enrollments: PipelineEnrollment[];
  currentYear: EcclesiasticalYear | null;
  userRole: UserRole;
  error: { message: string; status: number | null } | null;
};

export async function loadInvestiturePipelineList(
  user: AuthUser,
): Promise<InvestiturePipelineListResult> {
  const userRole = resolveInvestitureUserRole(extractRoles(user));

  try {
    const years = await loadEcclesiasticalYears();
    const currentYear = resolveCurrentEcclesiasticalYear(years);
    const enrollments = await getPipelineEnrollmentsForYear(
      currentYear?.ecclesiastical_year_id ?? null,
    );

    return {
      enrollments,
      currentYear,
      userRole,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        enrollments: [],
        currentYear: null,
        userRole,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      enrollments: [],
      currentYear: null,
      userRole,
      error: { message: "", status: null },
    };
  }
}

export type InvestitureConfigListResult = {
  configs: InvestitureConfig[];
  localFields: LocalField[];
  territoryScope: ReturnType<typeof resolveAdminTerritoryScope>;
  error: { message: string; status: number | null } | null;
};

export async function loadInvestitureConfigList(
  user: AuthUser,
): Promise<InvestitureConfigListResult> {
  const territoryScope = resolveAdminTerritoryScope(user);

  try {
    const [data, scopedLocalFields] = await Promise.all([
      getInvestitureConfigs(),
      listLocalFieldsForTerritory(user),
    ]);

    return {
      configs: Array.isArray(data) ? data : [],
      localFields: scopedLocalFields,
      territoryScope,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        configs: [],
        localFields: [],
        territoryScope,
        error: { message: error.message, status: error.status },
      };
    }

    return {
      configs: [],
      localFields: [],
      territoryScope,
      error: { message: "", status: null },
    };
  }
}
