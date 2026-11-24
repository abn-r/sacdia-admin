import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { CertificateBatchReview } from "@/components/certificate-bulk-imports/certificate-batch-review";
import { OcrStateSummary } from "@/components/certificate-bulk-imports/certificate-bulk-import-review-parts";
import { getBatchProgress, isInstitutionalItem } from "@/components/certificate-bulk-imports/certificate-batch-model";
import { formatShortId, formatUserName } from "@/components/certificate-bulk-imports/helpers";
import { getCertificateBulkImportDetail, type CertificateBulkImportBatch } from "@/lib/api/certificate-bulk-imports";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { getFormatDate } from "@/lib/format-locale";
import { requireAdminUser } from "@/lib/auth/session";

interface CertificateBulkImportDetailRouteProps {
  params: Promise<{ batchId: string }>;
}

export default async function CertificateBulkImportDetailRoute({
  params,
}: CertificateBulkImportDetailRouteProps) {
  await requireAdminUser();
  const t = await getTranslations("certificate_bulk_imports.detailPage");
  const tBatch = await getTranslations("queues.certificates.batch");
  const tStatus = await getTranslations("certificate_bulk_imports.batchStatus");
  const tCrumbs = await getTranslations("nav.breadcrumbs");
  const formatDate = await getFormatDate();
  const { batchId } = await params;

  let batch: CertificateBulkImportBatch | null = null;
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    batch = await getCertificateBulkImportDetail(batchId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    failure = errorStateFromError(error);
  }

  const crumbs = [
    { label: tCrumbs("home"), href: "/dashboard" },
    { label: t("breadcrumbList"), href: "/dashboard/certificate-bulk-imports" },
    { label: batch ? formatUserName(batch.user) : formatShortId(batchId) },
  ];

  if (!batch) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} breadcrumbs={crumbs} />
        <ErrorState {...(failure ?? { kind: "error" as const })} retry />
      </div>
    );
  }

  const visibleItems = (batch.items ?? []).filter((item) => !isInstitutionalItem(item));
  const progress = getBatchProgress({ ...batch, items: visibleItems });
  const status = tStatus.has(batch.status) ? tStatus(batch.status) : batch.status;

  return (
    <div className="flex flex-col gap-4">
      <DetailHeader
        breadcrumbs={crumbs}
        title={formatUserName(batch.user)}
        subtitle={tBatch("subtitle", {
          id: formatShortId(batch.batch_id),
          date: batch.submitted_at ? formatDate(batch.submitted_at) : "—",
        })}
        facts={[
          { label: tBatch("factStatus"), value: status },
          { label: tBatch("factProgress"), value: tBatch("progress", progress) },
        ]}
      />
      <OcrStateSummary state={batch.ocr_state} errorCode={batch.ocr_error_code} />
      <CertificateBatchReview batch={batch} />
    </div>
  );
}
