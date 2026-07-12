import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SlaDashboardClient } from "@/components/sla/sla-dashboard-client";
import { SlaRefreshButton } from "@/components/sla/sla-refresh-button";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadSlaDashboard } from "@/lib/v2/loaders/sla";

export const revalidate = 60;

function SlaDashboardSkeleton() {
  return (
    <div className="space-y-6">
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
    </div>
  );
}

function SlaError({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

async function SlaContent({ errorMessage }: { errorMessage: string }) {
  try {
    const data = await loadSlaDashboard();
    return <SlaDashboardClient data={data} />;
  } catch (error) {
    console.error("[V2SlaPage] Failed to load SLA dashboard data:", error);
    return <SlaError message={errorMessage} />;
  }
}

export default async function V2SlaPage() {
  await requireAdminUser();
  const t = await getTranslations("sla");

  return (
    <V2PageShell
      title={t("page.title")}
      description={t("page.description")}
      actions={<SlaRefreshButton />}
      bleed
    >
      <Suspense fallback={<SlaDashboardSkeleton />}>
        <SlaContent errorMessage={t("errors.load_failed")} />
      </Suspense>
    </V2PageShell>
  );
}
