import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { TransfersQueue } from "@/components/requests/transfers-queue";
import { getTransferRequests, type TransferRequest } from "@/lib/api/requests";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability } from "@/lib/auth/screen-catalog";
import { LONG_WAIT_DAYS, isLongWait } from "@/lib/requests/waiting";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queues.requests.transfers");
  return { title: t("title") };
}

export default async function TransferRequestsPage() {
  const user = await requireAdminUser();
  const t = await getTranslations("queues.requests.transfers");

  let requests: TransferRequest[] | null = null;
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    requests = await getTransferRequests();
  } catch (error) {
    failure = errorStateFromError(error);
  }

  // The finding, not an explanation: what waits and for how long.
  const pending = (requests ?? []).filter((request) => request.status === "PENDING");
  const longWait = pending.filter((request) => isLongWait(request.created_at)).length;
  const description = failure
    ? t("finding.unknown")
    : longWait > 0
      ? t("finding.longWait", { count: longWait, days: LONG_WAIT_DAYS })
      : pending.length > 0
        ? t("finding.pending", { count: pending.length })
        : t("finding.none");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={description} />
      <TransfersQueue
        initialRequests={requests}
        initialFailure={failure}
        canReview={canCapability(user, "requests-transfers", "review")}
      />
    </div>
  );
}
