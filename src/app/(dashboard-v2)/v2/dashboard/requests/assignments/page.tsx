import { Suspense } from "react";
import { UserCog } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AssignmentsClientPage } from "@/components/requests/assignments-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadAssignmentRequestsList } from "@/lib/v2/loaders/requests";

function AssignmentsSkeleton() {
  return <Skeleton className="h-72 w-full rounded-xl" />;
}

async function AssignmentsContent() {
  const t = await getTranslations("requests");
  const { items, error } = await loadAssignmentRequestsList();

  if (error) {
    const detail = error.message || t("pageAssignments.errorLoad");
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={error.status === 403 ? "forbidden" : "missing"}
          detail={detail}
        />
        <EmptyState
          icon={UserCog}
          title={t("pageAssignments.emptyTitle")}
          description={detail}
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title={t("pageAssignments.emptyTitle")}
        description={t("pageAssignments.emptyDescription")}
      />
    );
  }

  return <AssignmentsClientPage initialRequests={items} />;
}

export default async function V2AssignmentRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("requests");

  return (
    <V2PageShell
      title={t("pageAssignments.title")}
      description={t("pageAssignments.description")}
      bleed
    >
      <Suspense fallback={<AssignmentsSkeleton />}>
        <AssignmentsContent />
      </Suspense>
    </V2PageShell>
  );
}
