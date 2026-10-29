import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AnnualRankingBreakdownView } from "@/components/annual-rankings/annual-ranking-breakdown-view";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import {
  getAnnualRankingSectionProgress,
  type AnnualRankingSectionProgress,
} from "@/lib/api/annual-rankings";
import { ApiError } from "@/lib/api/client";

interface PageProps {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ year_id?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("annual_folders");
  return { title: t("pageRankingsBreakdown.title") };
}

export default async function AnnualRankingBreakdownPage({ params, searchParams }: PageProps) {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");
  const tNav = await getTranslations("nav.items");

  const { sectionId: sectionIdRaw } = await params;
  const { year_id } = await searchParams;
  const sectionId = Number(sectionIdRaw);
  const yearId = Number(year_id);

  if (!Number.isInteger(sectionId) || sectionId <= 0) notFound();
  if (!Number.isInteger(yearId) || yearId <= 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("pageRankingsBreakdown.paramsRequired")}
      </div>
    );
  }

  let data: AnnualRankingSectionProgress | null = null;
  let loadError: string | null = null;
  try {
    data = await getAnnualRankingSectionProgress(sectionId, yearId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    loadError =
      error instanceof ApiError && error.status === 403
        ? t("pageRankingsBreakdown.forbidden")
        : t("pageRankingsBreakdown.errorFallback");
  }

  const description = data?.club_type.name
    ? t("pageRankingsBreakdown.description", { clubType: data.club_type.name })
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.club_name ?? t("pageRankingsBreakdown.title")}
        description={description}
        breadcrumbs={[
          { label: tNav("annual_folders_rankings"), href: "/dashboard/annual-folders/rankings" },
          { label: data?.club_name ?? t("pageRankingsBreakdown.title") },
        ]}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {data && <AnnualRankingBreakdownView data={data} />}
    </div>
  );
}
