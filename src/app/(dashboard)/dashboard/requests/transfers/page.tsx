import { ArrowRightLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { TransfersClientPage } from "@/components/requests/transfers-client-page";
import { getTransferRequests, type TransferRequest } from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function TransferRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("requests");

  let requests: TransferRequest[] = [];
  let loadError: string | null = null;

  try {
    requests = await getTransferRequests();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("pageTransfers.errorLoad");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageTransfers.title")}
        description={t("pageTransfers.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && requests.length === 0 && (
        <EmptyState
          icon={ArrowRightLeft}
          title={t("pageTransfers.emptyTitle")}
          description={t("pageTransfers.emptyDescription")}
        />
      )}

      {!loadError && requests.length > 0 && (
        <TransfersClientPage initialRequests={requests} />
      )}
    </div>
  );
}
