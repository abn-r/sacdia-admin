import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { getSlaDashboard } from "@/lib/api/analytics";
import { SlaDashboardClient } from "@/components/sla/sla-dashboard-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SlaRefreshButton } from "@/components/sla/sla-refresh-button";

export const revalidate = 60;

// ─── Skeleton Fallback ────────────────────────────────────────────────────────

function SlaDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-1 h-7 w-20" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[220px] w-full rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue cards skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <Skeleton key={j} className="h-16 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Data Loader ──────────────────────────────────────────────────────────────

async function SlaContent() {
  const data = await getSlaDashboard();
  return <SlaDashboardClient data={data} />;
}

// ─── Error Fallback ───────────────────────────────────────────────────────────

function SlaError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ─── Wrapped with error boundary via ErrorBoundary pattern ───────────────────

async function SlaContentWithErrorBoundary({
  errorMessage,
}: {
  errorMessage: string;
}) {
  try {
    return await SlaContent();
  } catch (error) {
    console.error("[SlaPage] Failed to load SLA dashboard data:", error);
    return <SlaError message={errorMessage} />;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SlaPage() {
  await requireAdminUser();
  const t = await getTranslations("sla");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("page.title")}</h1>
          <p className="text-muted-foreground">{t("page.description")}</p>
        </div>
        <SlaRefreshButton />
      </div>
      <Suspense fallback={<SlaDashboardSkeleton />}>
        <SlaContentWithErrorBoundary errorMessage={t("errors.load_failed")} />
      </Suspense>
    </div>
  );
}
