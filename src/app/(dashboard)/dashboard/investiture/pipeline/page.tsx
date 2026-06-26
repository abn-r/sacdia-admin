import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import {
  getPipelineEnrollmentsForYear,
  type PipelineEnrollment,
} from "@/lib/api/investiture";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { extractRoles, SUPER_ADMIN_ROLE } from "@/lib/auth/roles";
import type { UserRole } from "@/components/investiture/pipeline-table";

type GenericRecord = Record<string, unknown>;

const PipelineClientPage = dynamic(
  () =>
    import("@/components/investiture/pipeline-client-page").then((m) => ({
      default: m.PipelineClientPage,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <div className="grid grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-6 gap-4 border-b px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-1.5">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserRole(roles: string[]): UserRole {
  const set = new Set(roles);
  // extractRoles() normalizes underscores to hyphens — compare with SUPER_ADMIN_ROLE
  if (set.has(SUPER_ADMIN_ROLE) || set.has("admin")) return "admin";
  if (set.has("coordinator")) return "coordinator";
  if (set.has("field")) return "field";
  return "director";
}

function extractYears(payload: unknown): EcclesiasticalYear[] {
  if (Array.isArray(payload)) return payload as EcclesiasticalYear[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as EcclesiasticalYear[];
  }
  return [];
}

function resolveCurrentYear(years: EcclesiasticalYear[]): EcclesiasticalYear | null {
  return (
    years.find((year) => year.active) ??
    [...years].sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ??
    null
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function InvestiturePipelinePage() {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture");

  const roles = extractRoles(user);
  const userRole = resolveUserRole(roles);

  let enrollments: PipelineEnrollment[] = [];
  let currentYear: EcclesiasticalYear | null = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    const yearsPayload = await listEcclesiasticalYears();
    const years = extractYears(yearsPayload);
    currentYear = resolveCurrentYear(years);
    enrollments = await getPipelineEnrollmentsForYear(
      currentYear?.ecclesiastical_year_id ?? null,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("pagePipeline.errorFallback");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pagePipeline.title")}
        description={t("pagePipeline.description")}
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && (
        <InvestitureI18nProvider>
          <PipelineClientPage
            initialEnrollments={enrollments}
            userRole={userRole}
            currentYearId={currentYear?.ecclesiastical_year_id ?? null}
            currentYearName={currentYear?.name ?? null}
          />
        </InvestitureI18nProvider>
      )}
    </div>
  );
}
