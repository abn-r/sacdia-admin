import type { Metadata } from "next";
import { CalendarOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { YearEndClientPage } from "@/components/year-end/year-end-client-page";
import { listEcclesiasticalYears, type EcclesiasticalYear } from "@/lib/api/catalogs";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("year_end");
  return { title: t("page.title") };
}

export default async function YearEndPage() {
  await requireAdminUser();
  const t = await getTranslations("year_end");

  let years: EcclesiasticalYear[] = [];
  let failure: ReturnType<typeof errorStateFromError> | null = null;

  try {
    const payload = await listEcclesiasticalYears();
    years = Array.isArray(payload) ? payload : [];
  } catch (err) {
    failure = errorStateFromError(err);
  }

  if (!failure && years.length > 0) {
    return <YearEndClientPage ecclesiasticalYears={years} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("page.title")} description={t("page.description")} />
      {failure ? (
        <ErrorState
          kind={failure.kind}
          detail={failure.detail}
          icon={CalendarOff}
          title={t("page.error_load_years")}
          retry
        />
      ) : (
        <EmptyState
          icon={CalendarOff}
          title={t("page.empty_no_years_title")}
          description={t("page.empty_no_years_description")}
        />
      )}
    </div>
  );
}
