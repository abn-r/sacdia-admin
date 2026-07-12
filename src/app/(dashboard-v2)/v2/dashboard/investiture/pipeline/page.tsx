import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadInvestiturePipelineList } from "@/lib/v2/loaders/investiture";

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
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    ),
  },
);

async function InvestiturePipelineContent() {
  const user = await requireAdminUser();
  const t = await getTranslations("investiture");
  const { enrollments, currentYear, userRole, error } =
    await loadInvestiturePipelineList(user);

  if (error) {
    return (
      <EndpointErrorBanner
        state={error.status === 403 ? "forbidden" : "missing"}
        detail={error.message || t("pagePipeline.errorFallback")}
      />
    );
  }

  return (
    <InvestitureI18nProvider>
      <PipelineClientPage
        initialEnrollments={enrollments}
        userRole={userRole}
        currentYearId={currentYear?.ecclesiastical_year_id ?? null}
        currentYearName={currentYear?.name ?? null}
      />
    </InvestitureI18nProvider>
  );
}

export default async function V2InvestiturePipelinePage() {
  await requireAdminUser();
  const t = await getTranslations("investiture");

  return (
    <V2PageShell
      title={t("pagePipeline.title")}
      description={t("pagePipeline.description")}
      bleed
    >
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        }
      >
        <InvestiturePipelineContent />
      </Suspense>
    </V2PageShell>
  );
}
