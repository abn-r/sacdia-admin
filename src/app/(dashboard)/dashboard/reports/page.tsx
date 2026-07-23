import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { DataTableShell } from "@/components/shared/data-table-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { resolveActiveClubContext } from "@/lib/auth/club-context";
import type { AuthUser } from "@/lib/auth/types";
import { getCurrentClubEnrollment, getClubEnrollmentId } from "@/lib/api/club-enrollments";
import { ApiError } from "@/lib/api/client";

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
  | { enrollment_id: string | number; available: true }
  | { enrollment_id: null; available: false; errorCode: EnrollmentErrorCode };

// ─── Data fetching ────────────────────────────────────────────────────────────

async function resolveReportEnrollment(user: AuthUser): Promise<ActiveEnrollmentResult> {
  const clubContext = resolveActiveClubContext(user);
  if (!clubContext) {
    return {
      enrollment_id: null,
      available: false,
      errorCode: "no_active_enrollment",
    };
  }

  try {
    const enrollment = await getCurrentClubEnrollment(
      clubContext.clubId,
      clubContext.sectionId,
    );
    const enrollmentId = getClubEnrollmentId(enrollment);

    if (enrollmentId) {
      return { enrollment_id: enrollmentId, available: true };
    }

    return {
      enrollment_id: null,
      available: false,
      errorCode: "no_active_enrollment",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 403) {
        return {
          enrollment_id: null,
          available: false,
          errorCode: "no_role_access",
        };
      }

      if (error.status === 404) {
        return {
          enrollment_id: null,
          available: false,
          errorCode: "no_active_enrollment",
        };
      }
    }

    return {
      enrollment_id: null,
      available: false,
      errorCode: "unknown",
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
  user,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"reports">>>;
  user: AuthUser;
}) {
  const result = await resolveReportEnrollment(user);

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
  const user = await requireAdminUser();
  const t = await getTranslations("reports");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports/monthly-preview">
            <FileText aria-hidden="true" />
            {t("page.print_preview")}
          </Link>
        </Button>
      </PageHeader>

      <Suspense fallback={<ReportsPageSkeleton />}>
        <ReportsContent t={t} user={user} />
      </Suspense>
    </div>
  );
}
