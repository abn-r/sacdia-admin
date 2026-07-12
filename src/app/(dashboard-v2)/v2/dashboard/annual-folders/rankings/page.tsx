import { Suspense } from "react";
import dynamic from "next/dynamic";
import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadAnnualFoldersRankings } from "@/lib/v2/loaders/annual-folders";

const RankingsClientPage = dynamic(
  () =>
    import("@/components/annual-folders/rankings-client-page").then((m) => ({
      default: m.RankingsClientPage,
    })),
  {
    loading: () => <Skeleton className="h-72 w-full rounded-xl" />,
  },
);

function RankingsSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function RankingsContent() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders");
  const result = await loadAnnualFoldersRankings(user);

  if (result.error) {
    const detail = result.error.message || t("pageRankings.errorFallback");
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={result.error.status === 403 ? "forbidden" : "missing"}
          detail={detail}
        />
        <EmptyState
          icon={TrendingUp}
          title={t("pageRankings.emptyTitle")}
          description={detail}
        />
      </div>
    );
  }

  if (result.clubTypes.length === 0 || result.localFields.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title={t("pageRankings.emptyTitle")}
        description={t("pageRankings.emptyDescription")}
      />
    );
  }

  return (
    <RankingsClientPage
      initialRankings={result.initialRankings}
      clubTypes={result.clubTypes}
      ecclesiasticalYears={result.ecclesiasticalYears}
      localFields={result.localFields}
      initialClubTypeId={result.defaultClubTypeId}
      initialYearId={result.defaultYearId}
      initialLocalFieldId={result.defaultLocalFieldId}
    />
  );
}

export default async function V2RankingsPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  return (
    <V2PageShell
      title={t("pageRankings.title")}
      description={t("pageRankings.description")}
      bleed
    >
      <Suspense fallback={<RankingsSkeleton />}>
        <RankingsContent />
      </Suspense>
    </V2PageShell>
  );
}
