import { Suspense } from "react";
import { ArrowRightLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { TransfersClientPage } from "@/components/requests/transfers-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadTransferRequestsList } from "@/lib/v2/loaders/requests";

function TransfersSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function TransfersContent() {
  const t = await getTranslations("requests");
  const { items, error } = await loadTransferRequestsList();

  if (error) {
    const detail = error.message || t("pageTransfers.errorLoad");
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={error.status === 403 ? "forbidden" : "missing"}
          detail={detail}
        />
        <EmptyState
          icon={ArrowRightLeft}
          title={t("pageTransfers.emptyTitle")}
          description={detail}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ArrowRightLeft}
        title={t("pageTransfers.emptyTitle")}
        description={t("pageTransfers.emptyDescription")}
      />
    );
  }

  return <TransfersClientPage initialRequests={items} />;
}

export default async function V2TransferRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("requests");

  return (
    <V2PageShell
      title={t("pageTransfers.title")}
      description={t("pageTransfers.description")}
      bleed
    >
      <Suspense fallback={<TransfersSkeleton />}>
        <TransfersContent />
      </Suspense>
    </V2PageShell>
  );
}
