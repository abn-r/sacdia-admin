import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { formatUserName } from "@/components/certificate-bulk-imports/helpers";
import { CertificateBulkImportDetailPage } from "@/components/certificate-bulk-imports/certificate-bulk-import-detail-page";
import { getCertificateBulkImportDetail } from "@/lib/api/certificate-bulk-imports";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

interface CertificateBulkImportDetailRouteProps {
  params: Promise<{ batchId: string }>;
}

export default async function ClubsCertificateBulkImportDetailRoute({
  params,
}: CertificateBulkImportDetailRouteProps) {
  await requireAdminUser();
  const t = await getTranslations("certificate_bulk_imports.detailPage");
  const tValidations = await getTranslations("clubs.pages.validations");
  const tCrumbs = await getTranslations("nav.breadcrumbs");
  const { batchId } = await params;

  let batch = null;
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    batch = await getCertificateBulkImportDetail(batchId);
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
        title={batch ? formatUserName(batch.user) : t("title")}
        description={t("description", { batchId: batchId.slice(0, 8).toUpperCase() })}
        breadcrumbs={[
          { label: tCrumbs("home"), href: "/dashboard" },
          { label: tValidations("title"), href: "/dashboard/clubs/validations?tab=certificates" },
          { label: batch ? formatUserName(batch.user) : batchId.slice(0, 8).toUpperCase() },
        ]}
      />

      {loadError && (
        <EndpointErrorBanner
          state={loadErrorStatus === 403 ? "forbidden" : "missing"}
          detail={loadError}
        />
      )}

      {!loadError && !batch && (
        <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!loadError && batch && (
        <CertificateBulkImportDetailPage batch={batch} />
      )}
    </div>
  );
}
