import { Suspense } from "react";
import { FileSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EvidenceReviewClientPage } from "@/components/evidence-review/evidence-review-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadEvidenceReviewList } from "@/lib/v2/loaders/evidence-review";

function EvidenceReviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function EvidenceReviewContent() {
  const t = await getTranslations("evidence_review");
  const { items, pendingCount, error } = await loadEvidenceReviewList();

  if (error) {
    const detail = error.message || t("page.errorLoad");
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={error.status === 403 ? "forbidden" : "missing"}
          detail={detail}
        />
        <EmptyState
          icon={FileSearch}
          title={t("page.emptyTitle")}
          description={detail}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title={t("page.emptyTitle")}
        description={t("page.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <EvidenceReviewClientPage initialItems={items} />
      {pendingCount === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {t("page.allReviewed")}
        </p>
      ) : null}
    </div>
  );
}

export default async function V2EvidenceReviewPage() {
  await requireAdminUser();
  const t = await getTranslations("evidence_review");

  return (
    <V2PageShell title={t("page.title")} description={t("page.description")} bleed>
      <Suspense fallback={<EvidenceReviewSkeleton />}>
        <EvidenceReviewContent />
      </Suspense>
    </V2PageShell>
  );
}
