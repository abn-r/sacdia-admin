import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { InstitutionalCertificateRequestListPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-list-page";
import {
  listInstitutionalCertificateRequests,
  type PaginatedInstitutionalCertificateRequests,
} from "@/lib/api/institutional-certificate-requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function InstitutionalCertificateRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("institutional_certificate_requests.page");

  let data: PaginatedInstitutionalCertificateRequests = {
    items: [],
    total: 0,
    page: 1,
    limit: 100,
  };
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    data = await listInstitutionalCertificateRequests({ page: 1, limit: 100 });
  } catch (error) {
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("loadError");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && data.items.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && data.items.length > 0 && (
        <InstitutionalCertificateRequestListPage
          requests={data.items}
          total={data.total}
        />
      )}
    </div>
  );
}
