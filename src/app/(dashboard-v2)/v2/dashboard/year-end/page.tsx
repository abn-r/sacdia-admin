import { CalendarOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { YearEndClientPage } from "@/components/year-end/year-end-client-page";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

export default async function YearEndPage() {
  await requireAdminUser();
  const t = await getTranslations("year_end");

  let years: EcclesiasticalYear[] = [];
  let loadError: string | null = null;

  try {
    const payload = await listEcclesiasticalYears();
    years = Array.isArray(payload) ? payload : [];
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : t("page.error_load_years");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.description")}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && years.length === 0 && (
        <EmptyState
          icon={CalendarOff}
          title={t("page.empty_no_years_title")}
          description={t("page.empty_no_years_description")}
        />
      )}

      {!loadError && years.length > 0 && (
        <YearEndClientPage ecclesiasticalYears={years} />
      )}
    </div>
  );
}
