import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { InvestitureI18nProvider } from "@/components/investiture/investiture-i18n-provider";
import { InvestitureClientPage } from "@/components/investiture/investiture-client-page";
import { ApiError } from "@/lib/api/client";
import { getPendingInvestitures } from "@/lib/api/investiture";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import type { EcclesiasticalYear } from "@/lib/api/catalogs";
import type { PendingEnrollment } from "@/lib/api/investiture";

type GenericRecord = Record<string, unknown>;

function extractYears(payload: unknown): EcclesiasticalYear[] {
  if (Array.isArray(payload)) return payload as EcclesiasticalYear[];
  if (payload && typeof payload === "object") {
    const root = payload as GenericRecord;
    if (Array.isArray(root.data)) return root.data as EcclesiasticalYear[];
  }
  return [];
}

export default async function InvestiturePage() {
  await requireAdminUser();
  const t = await getTranslations("investiture");

  let enrollments: PendingEnrollment[] = [];
  let years: EcclesiasticalYear[] = [];
  let initialYearId: number | null = null;
  let loadError: string | null = null;

  try {
    const [yearsPayload] = await Promise.allSettled([listEcclesiasticalYears()]);
    if (yearsPayload.status === "fulfilled") {
      years = extractYears(yearsPayload.value);
      initialYearId =
        years.find((year) => year.active)?.ecclesiastical_year_id ??
        years[0]?.ecclesiastical_year_id ??
        null;
    }

    const pendingPayload = await getPendingInvestitures({
      page: 1,
      limit: 100,
      ...(initialYearId ? { ecclesiastical_year_id: initialYearId } : {}),
    });
    enrollments = pendingPayload.data;
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : t("page.errorFallback");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && (
        <InvestitureI18nProvider>
          <InvestitureClientPage
            initialEnrollments={enrollments}
            years={years}
            initialYearId={initialYearId}
          />
        </InvestitureI18nProvider>
      )}
    </div>
  );
}
