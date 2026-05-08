import { Settings2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { RankingWeightsClientPage } from "@/components/ranking-weights/ranking-weights-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { fetchRankingWeights } from "@/lib/api/ranking-weights";
import type { RankingWeights } from "@/lib/api/ranking-weights";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function RankingWeightsPage() {
  await requireAdminUser();
  const t = await getTranslations("rankingWeights.pages.list");

  let weights: RankingWeights[] = [];
  let loadError: string | null = null;

  try {
    const result = await fetchRankingWeights();
    weights = Array.isArray(result) ? result : [];
  } catch (err) {
    if (err instanceof ApiError) {
      loadError = err.message;
    } else {
      loadError = t("loadFailed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && weights.length === 0 && (
        <EmptyState
          icon={Settings2}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && weights.length > 0 && (
        <RankingWeightsClientPage initial={weights} />
      )}
    </div>
  );
}
