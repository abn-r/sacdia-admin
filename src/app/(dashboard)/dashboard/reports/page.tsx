import { Suspense } from "react";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ReportsListClient } from "@/components/reports/reports-list-client";
import { requireAdminUser } from "@/lib/auth/session";
import { apiRequest, ApiError } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveEnrollmentResult =
  | { enrollment_id: number; available: true }
  | { enrollment_id: null; available: false; error: string };

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
      error: "No se encontro una inscripcion activa para tu usuario.",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return {
          enrollment_id: null,
          available: false,
          error: "No tenés una inscripcion activa en el sistema.",
        };
      }
      if (error.status === 403) {
        return {
          enrollment_id: null,
          available: false,
          error: "Tu rol no tiene acceso al modulo de reportes mensuales.",
        };
      }
    }
    return {
      enrollment_id: null,
      available: false,
      error: "No se pudo determinar tu inscripcion activa. Intentá de nuevo.",
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
      <div className="rounded-md border">
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
      </div>
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

async function ReportsContent() {
  const result = await fetchActiveEnrollment();

  if (!result.available) {
    return (
      <div className="space-y-4">
        <EndpointErrorBanner state="missing" detail={result.error} />
        <EmptyState
          icon={FileText}
          title="Sin inscripcion activa"
          description={result.error}
        />
      </div>
    );
  }

  return <ReportsListClient enrollmentId={result.enrollment_id} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes Mensuales"
        description="Gestion de reportes mensuales de actividades del club."
      />

      <Suspense fallback={<ReportsPageSkeleton />}>
        <ReportsContent />
      </Suspense>
    </div>
  );
}
