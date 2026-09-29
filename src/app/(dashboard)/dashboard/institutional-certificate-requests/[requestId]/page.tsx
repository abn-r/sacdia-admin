import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { InstitutionalCertificateRequestDetailPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-detail-page";
import { getInstitutionalCertificateRequestDetail } from "@/lib/api/institutional-certificate-requests";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ requestId: string }>;
}

export default async function InstitutionalCertificateRequestDetailRoute({
  params,
}: RouteProps) {
  await requireAdminUser();
  const t = await getTranslations("institutional_certificate_requests.detailPage");
  const { requestId } = await params;

  let request = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    request = await getInstitutionalCertificateRequestDetail(requestId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiError) {
      loadError = error.message;
      loadErrorStatus = error.status;
    } else {
      loadError = t("loadError");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description", { requestId: requestId.slice(0, 8).toUpperCase() })}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          {
            label: t("breadcrumbList"),
            href: "/dashboard/institutional-certificate-requests",
          },
          { label: requestId.slice(0, 8).toUpperCase() },
        ]}
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && !request && (
        <EmptyState
          icon={FileText}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      )}

      {!loadError && request && (
        <InstitutionalCertificateRequestDetailPage request={request} />
      )}
    </div>
  );
}
