import dynamic from "next/dynamic";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { apiRequest, ApiError } from "@/lib/api/client";

const ReportsListClient = dynamic(
  () =>
    import("@/components/reports/reports-list-client").then((m) => ({
      default: m.ReportsListClient,
    })),
  { loading: () => <ReportsPageSkeleton /> },
);

// ─── Types ────────────────────────────────────────────────────────────────────

type EnrollmentErrorCode = "no_active_enrollment" | "no_role_access" | "unknown";

type ActiveEnrollmentResult =
  | { enrollment_id: number; available: true }
  | { enrollment_id: null; available: false; errorCode: EnrollmentErrorCode };

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchActiveEnrollment(): Promise<ActiveEnrollmentResult> {
  try {
    // Fetch the current user's active enrollment via the enrollments endpoint.
    // We ask for the user's own active enrollment using the me/enrollment route.
    const payload = await apiRequest<unknown>("/enrollments/me/active");

    const data = (
      payload && typeof payload === "object" && "data" in payload
        ? (payload as { data?: unknown }).data
        : payload
    ) as Record<string, unknown> | null;

    const id =
      data && typeof data === "object"
        ? (data as Record<string, unknown>).enrollment_id
        : null;

    if (typeof id === "number" && id > 0) {
      return { enrollment_id: id, available: true };
    }

    // Fallback: try /enrollments/my
    const fallback = await apiRequest<unknown>("/enrollments/my");
    const fallbackData = (
      fallback && typeof fallback === "object" && "data" in fallback
        ? (fallback as { data?: unknown }).data
        : fallback
    ) as Record<string, unknown> | null;

    const fallbackId =
      fallbackData && typeof fallbackData === "object"
        ? (fallbackData as Record<string, unknown>).enrollment_id
        : null;

    if (typeof fallbackId === "number" && fallbackId > 0) {
      return { enrollment_id: fallbackId, available: true };
    }

    return {
      enrollment_id: null,
      available: false,
      errorCode: "no_active_enrollment" as const,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return {
          enrollment_id: null,
          available: false,
          errorCode: "no_active_enrollment" as const,
        };
      }
      if (error.status === 403) {
        return {
          enrollment_id: null,
          available: false,
          errorCode: "no_role_access" as const,
        };
      }
    }
    return {
      enrollment_id: null,
      available: false,
      errorCode: "unknown" as const,
    };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ReportsPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-[110px]" />
        <Skeleton className="h-8 w-[140px]" />
        <Skeleton className="h-8 w-[90px]" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-8 w-[130px]" />
          <Skeleton className="h-8 w-[90px]" />
          <Skeleton className="h-8 w-[120px]" />
        </div>
      </div>
      <DataTableShell>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="hidden h-4 w-24 md:block" />
            <Skeleton className="h-8 w-40" />
          </div>
        ))}
      </DataTableShell>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function ReportsContent({
  t,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"reports">>>;
}) {
  const result = await fetchActiveEnrollment();

  if (!result.available) {
    const errorMessage = t(`errors.${result.errorCode}`);
    return (
      <div className="space-y-4">
        <EndpointErrorBanner state="missing" detail={errorMessage} />
        <EmptyState
          icon={FileText}
          title={t("page.empty_no_active_enrollment_title")}
          description={errorMessage}
        />
      </div>
    );
  }

  return <ReportsListClient enrollmentId={result.enrollment_id} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
  await requireAdminUser();
  const t = await getTranslations("reports");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      <Suspense fallback={<ReportsPageSkeleton />}>
        <ReportsContent t={t} />
      </Suspense>
    </div>
  );
}
