import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { MembershipRequestsClientPage } from "@/components/membership/membership-requests-client-page";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { requireAdminUser } from "@/lib/auth/session";
import { loadMembershipRequestsList } from "@/lib/v2/loaders/membership-requests";

function MembershipRequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

async function MembershipRequestsContent() {
  const t = await getTranslations("requests");
  const { sections, available, error } = await loadMembershipRequestsList();

  if (!available) {
    const detail = error?.message || t("pageMembership.errorLoad");
    return (
      <div className="space-y-4">
        <EndpointErrorBanner
          state={error?.status === 403 ? "forbidden" : "missing"}
          detail={detail}
        />
        <EmptyState
          icon={UserPlus}
          title={t("pageMembership.emptyTitle")}
          description={detail}
        />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title={t("pageMembership.emptyTitle")}
        description={t("pageMembership.emptyDescription")}
      />
    );
  }

  return <MembershipRequestsClientPage sections={sections} />;
}

export default async function V2MembershipRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("requests");

  return (
    <V2PageShell
      title={t("pageMembership.title")}
      description={t("pageMembership.description")}
      bleed
    >
      <Suspense fallback={<MembershipRequestsSkeleton />}>
        <MembershipRequestsContent />
      </Suspense>
    </V2PageShell>
  );
}
