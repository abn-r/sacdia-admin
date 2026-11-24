import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { InstitutionalCertificateRequestDetailPage } from "@/components/institutional-certificate-requests/institutional-certificate-request-detail-page";
import {
  getInstitutionalCertificateRequestDetail,
  type InstitutionalCertificateRequest,
} from "@/lib/api/institutional-certificate-requests";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ requestId: string }>;
}

export default async function InstitutionalCertificateRequestDetailRoute({ params }: RouteProps) {
  await requireAdminUser();
  const t = await getTranslations("institutional_certificate_requests.detailPage");
  const tCrumbs = await getTranslations("nav.breadcrumbs");
  const { requestId } = await params;

  let request: InstitutionalCertificateRequest | null = null;
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    request = await getInstitutionalCertificateRequestDetail(requestId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    failure = errorStateFromError(error);
  }

  const breadcrumbs = [
    { label: tCrumbs("home"), href: "/dashboard" },
    { label: t("breadcrumbList"), href: "/dashboard/institutional-certificate-requests" },
    { label: request?.applicant_name ?? requestId.slice(0, 8).toUpperCase() },
  ];

  if (!request) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("title")} breadcrumbs={breadcrumbs} />
        <ErrorState {...(failure ?? { kind: "error" as const })} retry />
      </div>
    );
  }

  return <InstitutionalCertificateRequestDetailPage request={request} breadcrumbs={breadcrumbs} />;
}
