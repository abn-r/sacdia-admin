import { FileSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { EvidenceReviewClientPage } from "@/components/evidence-review/evidence-review-client-page";
import { getEvidencePending, type EvidenceItem } from "@/lib/api/evidence-review";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EvidenceReviewPage() {
  await requireAdminUser();
  const t = await getTranslations("evidence_review");

  let items: EvidenceItem[] = [];
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    const result = await getEvidencePending(undefined, 1, 200);
    items = result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("page.errorLoad");
    }
  }

  const pendingCount = items.filter((item) =>
    ["SUBMITTED", "PENDING_REVIEW"].includes(item.status),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && items.length === 0 && (
        <EmptyState
          icon={FileSearch}
          title={t("page.emptyTitle")}
          description={t("page.emptyDescription")}
        />
      )}

      {!loadError && items.length > 0 && (
        <EvidenceReviewClientPage initialItems={items} />
      )}

      {!loadError && pendingCount === 0 && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {t("page.allReviewed")}
        </p>
      )}
    </div>
  );
}
