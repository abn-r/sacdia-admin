import { FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { CertificateBulkImportListPage } from "@/components/certificate-bulk-imports/certificate-bulk-import-list-page";
import {
  getPendingCertificateBulkImports,
  type PaginatedCertificateBulkImports,
} from "@/lib/api/certificate-bulk-imports";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function CertificateBulkImportsPage() {
  await requireAdminUser();
  const t = await getTranslations("certificate_bulk_imports.page");

  let data: PaginatedCertificateBulkImports = { items: [], total: 0, page: 1, limit: 20 };
  let loadError: string | null = null;
  let loadErrorStatus: number | null = null;

  try {
    data = await getPendingCertificateBulkImports({ page: 1, limit: 100 });
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
        <EmptyState icon={FileText} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!loadError && data.items.length > 0 && (
        <CertificateBulkImportListPage batches={data.items} total={data.total} />
      )}
    </div>
  );
}
