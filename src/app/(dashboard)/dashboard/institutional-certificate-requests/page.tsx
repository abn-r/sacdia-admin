import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { InstitutionalCertificateRequestListPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-list-page";
import {
  listInstitutionalCertificateRequests,
  type PaginatedInstitutionalCertificateRequests,
} from "@/lib/api/institutional-certificate-requests";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("institutional_certificate_requests.page");
  return { title: t("title") };
}

export default async function InstitutionalCertificateRequestsPage() {
  await requireAdminUser();
  const t = await getTranslations("institutional_certificate_requests.page");
  const tGm = await getTranslations("queues.certificates.gm");

  let data: PaginatedInstitutionalCertificateRequests = {
    items: [],
    total: 0,
    page: 1,
    limit: 100,
  };
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    data = await listInstitutionalCertificateRequests({ page: 1, limit: 100 });
  } catch (error) {
    failure = errorStateFromError(error);
  }

  const pending = data.items.filter((r) => r.status === "PENDING_REVIEW").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={failure ? tGm("description") : tGm("finding", { count: pending })}
      />

      {failure && <ErrorState {...failure} retry />}

      {!failure && data.items.length === 0 && (
        <EmptyState icon={GraduationCap} title={t("emptyTitle")} description={t("emptyDescription")} />
      )}

      {!failure && data.items.length > 0 && (
        <InstitutionalCertificateRequestListPage requests={data.items} total={data.total} />
      )}
    </div>
  );
}
