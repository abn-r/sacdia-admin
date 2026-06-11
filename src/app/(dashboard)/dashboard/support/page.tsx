import { Suspense } from "react";
import { Headset } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { SupportReportsClient } from "@/components/support/support-reports-client";
import {
  listSupportReports,
  type SupportReportCategory,
  type SupportReportStatus,
  type SupportReportsPage,
} from "@/lib/api/support-reports";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

const STATUS_VALUES = new Set(["open", "in_progress", "resolved", "closed"]);
const CATEGORY_VALUES = new Set([
  "bug",
  "feature_request",
  "account",
  "data_issue",
  "performance",
  "other",
]);

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(
  value: string | string[] | undefined,
  fallback: number,
) {
  const parsed = Number.parseInt(single(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseFilters(params: Record<string, string | string[] | undefined>) {
  const rawStatus = single(params.status);
  const rawCategory = single(params.category);
  const search = single(params.search)?.trim() || undefined;

  return {
    search,
    status: STATUS_VALUES.has(rawStatus ?? "")
      ? (rawStatus as SupportReportStatus)
      : undefined,
    category: CATEGORY_VALUES.has(rawCategory ?? "")
      ? (rawCategory as SupportReportCategory)
      : undefined,
    page: parsePositiveInt(params.page, 1),
    limit: Math.min(parsePositiveInt(params.limit, 20), 100),
  };
}

function SupportReportsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

async function SupportReportsContent({
  filters,
}: {
  filters: ReturnType<typeof parseFilters>;
}) {
  let data: SupportReportsPage;

  try {
    data = await listSupportReports(filters);
  } catch (error) {
    const detail =
      error instanceof ApiError
        ? error.message
        : "No se pudieron cargar los reportes de soporte.";
    return <EndpointErrorBanner state="missing" detail={detail} />;
  }

  if (
    data.total === 0 &&
    !filters.search &&
    !filters.status &&
    !filters.category
  ) {
    return (
      <EmptyState
        icon={Headset}
        title="Aún no hay reportes de soporte"
        description="Cuando un usuario reporte un error o solicitud desde la app, aparecerá aquí para seguimiento."
      />
    );
  }

  return <SupportReportsClient pageData={data} filters={filters} />;
}

export default async function SupportReportsPage({ searchParams }: PageProps) {
  await requireAdminUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soporte"
        description="Consulta y atiende los reportes enviados desde la app móvil."
      />
      <Suspense fallback={<SupportReportsSkeleton />}>
        <SupportReportsContent filters={filters} />
      </Suspense>
    </div>
  );
}
