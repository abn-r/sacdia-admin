import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import { InvestitureClientPage } from "@/components/investiture/investiture-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadInvestiturePendingList } from "@/lib/v2/loaders/investiture";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function InvestitureSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function InvestiturePendingContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("investiture");
  const yearRaw = searchParams.year;
  const yearId =
    typeof yearRaw === "string" && yearRaw.trim().length > 0
      ? Number(yearRaw)
      : undefined;

  const { enrollments, years, initialYearId, error } = await loadInvestiturePendingList({
    page: 1,
    limit: 100,
    ...(Number.isFinite(yearId) ? { ecclesiastical_year_id: yearId } : {}),
  });

  if (error) {
    return (
      <EndpointErrorBanner
        state={error.status === 403 ? "forbidden" : "missing"}
        detail={error.message || t("page.errorFallback")}
      />
    );
  }

  return (
    <InvestitureI18nProvider>
      <InvestitureClientPage
        initialEnrollments={enrollments}
        years={years}
        initialYearId={initialYearId}
      />
    </InvestitureI18nProvider>
  );
}

export default async function V2InvestiturePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const t = await getTranslations("investiture");
  const rawParams = await searchParams;

  return (
    <V2PageShell title={t("page.title")} description={t("page.description")} bleed>
      <Suspense fallback={<InvestitureSkeleton />}>
        <InvestiturePendingContent searchParams={rawParams} />
      </Suspense>
    </V2PageShell>
  );
}
