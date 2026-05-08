import { UserCog } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { AssignmentsClientPage } from "@/components/requests/assignments-client-page";
import { getAssignmentRequests, type AssignmentRequest } from "@/lib/api/requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function AssignmentRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("requests");

  let requests: AssignmentRequest[] = [];
  let loadError: string | null = null;

  try {
    requests = await getAssignmentRequests();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("pageAssignments.errorLoad");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageAssignments.title")}
        description={t("pageAssignments.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && requests.length === 0 && (
        <EmptyState
          icon={UserCog}
          title={t("pageAssignments.emptyTitle")}
          description={t("pageAssignments.emptyDescription")}
        />
      )}

      {!loadError && requests.length > 0 && (
        <AssignmentsClientPage initialRequests={requests} />
      )}
    </div>
  );
}
