import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import { getInvestitureRequestErrorMessage } from "@/components/investiture-requests/investiture-request-errors";
import { RequestDetailClientPage } from "@/components/investiture-requests/request-detail-client-page";
import { ApiError } from "@/lib/api/client";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import {
  getInvestitureRequest,
  type InvestitureRequest,
} from "@/lib/api/investiture-requests";
import { requireAdminUser } from "@/lib/auth/session";

interface RouteProps {
  params: Promise<{ requestId: string }>;
}

export default async function InvestitureRequestDetailRoute({ params }: RouteProps) {
  await requireAdminUser();
  const t = await getTranslations("investiture_requests");
  const { requestId } = await params;

  let request: InvestitureRequest | null = null;
  let loadError: { status: number | null; message: string } | null = null;

  try {
    request = await getInvestitureRequest(requestId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    loadError = {
      status: error instanceof ApiError ? error.status : null,
      message: getInvestitureRequestErrorMessage(error, t),
    };
  }

  if (!request) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("detail.titleFallback")}
          breadcrumbs={[
            { label: t("detail.breadcrumbHome"), href: "/dashboard" },
            { label: t("detail.breadcrumbList"), href: "/dashboard/investiture-requests" },
            { label: t("detail.titleFallback") },
          ]}
        />
        <EndpointErrorBanner
          state={loadError?.status === 403 ? "forbidden" : "missing"}
          detail={loadError?.message ?? t("errors.generic")}
        />
      </div>
    );
  }

  let yearName: string | null = null;
  try {
    const years = await listEcclesiasticalYears();
    yearName =
      years.find((year) => year.ecclesiastical_year_id === request?.ecclesiastical_year_id)?.name ??
      null;
  } catch {
    // The year label is informative only.
  }

  return <RequestDetailClientPage request={request} yearName={yearName} />;
}
