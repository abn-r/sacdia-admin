import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipRequestsClientPage } from "@/components/membership/membership-requests-client-page";
import {
  loadReviewSectionOptions,
  resolveClubGrantSections,
} from "@/lib/membership/section-options";
import { resolveMembershipReviewMode } from "@/lib/auth/membership-review-mode";
import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";

export default async function MembershipRequestsPage() {
  const user = await requireAdminUser();
  // approve: club_members:approve. verify-only: consent:verify alone (coordinators).
  // The dashboard layout already gates the route; this is the fail-closed backstop.
  const mode = resolveMembershipReviewMode(user);
  if (!mode) redirect("/dashboard");

  const t = await getTranslations("requests");
  // Picker sources: the viewer's own club grants (approve / consent:verify) and, for
  // a reviewer who may also be a coordinator, their assigned sections (verify-only).
  const result = await loadReviewSectionOptions(mode, {
    clubGrants: resolveClubGrantSections(user),
    includeCoordinatorScope: canCapability(user, "requests-membership", "verify_consent"),
  });
  const header = mode === "verify-only" ? "pageConsentVerify" : "pageMembership";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t(`${header}.title`)}
        description={t(`${header}.description`)}
      />

      {!result.available && (
        <EndpointErrorBanner
          state="missing"
          detail={result.error ?? t(`${header}.errorLoad`)}
        />
      )}

      {result.available && result.sections.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title={t(`${header}.emptyTitle`)}
          description={t(`${header}.emptyDescription`)}
        />
      )}

      {result.available && result.sections.length > 0 && (
        <MembershipRequestsClientPage
          sections={result.sections}
          mode={mode}
          coordinatorQueue={result.coordinatorQueue}
        />
      )}
    </div>
  );
}
