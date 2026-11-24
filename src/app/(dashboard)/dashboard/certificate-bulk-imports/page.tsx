import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { CertificateBatchQueue } from "@/components/certificate-bulk-imports/certificate-batch-queue";
import { getBatchCounts } from "@/components/certificate-bulk-imports/helpers";
import {
  getPendingCertificateBulkImports,
  type PaginatedCertificateBulkImports,
} from "@/lib/api/certificate-bulk-imports";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";
import { FileText } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("certificate_bulk_imports.page");
  return { title: t("title") };
}

export default async function CertificateBulkImportsPage() {
  await requireAdminUser();
  const t = await getTranslations("certificate_bulk_imports.page");
  const tQueue = await getTranslations("queues.certificates.batches");

  let data: PaginatedCertificateBulkImports = { items: [], total: 0, page: 1, limit: 20 };
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    data = await getPendingCertificateBulkImports({ page: 1, limit: 100 });
  } catch (error) {
    failure = errorStateFromError(error);
  }

  const toReview = data.items.filter((batch) => batch.status === "SUBMITTED").length;
  const rows = data.items.reduce((sum, batch) => {
    const counts = getBatchCounts(batch);
    return sum + counts.pending + counts.needsReview;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={failure ? t("description") : tQueue("finding", { batches: toReview, rows })}
      />

      {failure && <ErrorState {...failure} retry />}

      {!failure && data.items.length === 0 && (
        <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!failure && data.items.length > 0 && (
        <CertificateBatchQueue batches={data.items} total={data.total} />
      )}
    </div>
  );
}
