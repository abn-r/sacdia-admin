import { Suspense } from "react";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadAnnualFoldersTemplates } from "@/lib/v2/loaders/annual-folders";

const TemplatesClientPage = dynamic(
  () =>
    import("@/components/annual-folders/templates-client-page").then((m) => ({
      default: m.TemplatesClientPage,
    })),
  {
    loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
  },
);

function TemplatesSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function TemplatesContent() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");
  const result = await loadAnnualFoldersTemplates(user);

  if (result.error) {
    return (
      <EndpointErrorBanner
        state={result.error.status === 403 ? "forbidden" : "missing"}
        detail={result.error.message || t("pageTemplates.errorFallback")}
      />
    );
  }

  return (
    <TemplatesClientPage
      initialTemplates={result.templates}
      rankingConfigs={result.rankingConfigs}
      clubTypes={result.clubTypes}
      ecclesiasticalYears={result.ecclesiasticalYears}
      unions={result.unions}
      localFields={result.localFields}
      territoryScope={result.territoryScope}
    />
  );
}

export default async function V2TemplatesPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  return (
    <V2PageShell
      title={t("pageTemplates.title")}
      description={t("pageTemplates.description")}
      bleed
    >
      <Suspense fallback={<TemplatesSkeleton />}>
        <TemplatesContent />
      </Suspense>
    </V2PageShell>
  );
}
