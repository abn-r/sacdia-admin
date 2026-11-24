import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AnnualRankingBreakdownView } from "@/components/annual-rankings/annual-ranking-breakdown-view";
import { DetailHeader } from "@/components/shared/detail-header";
import { ErrorState } from "@/components/shared/error-state";
import { resolveYearLabelById } from "@/lib/annual-folders/ecclesiastical-year-label";
import {
  getAnnualRankingSectionProgress,
  type AnnualRankingSectionProgress,
} from "@/lib/api/annual-rankings";
import { listEcclesiasticalYears } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { errorStateFromError } from "@/lib/api/error-state";
import { requireAdminUser } from "@/lib/auth/session";
import { getFormatNumber } from "@/lib/format-locale";
import { recognitionStatus } from "@/lib/progress/annual";

interface PageProps {
  params: Promise<{ sectionId: string }>;
  searchParams: Promise<{ year_id?: string }>;
}

const LIST_HREF = "/dashboard/annual-folders/rankings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("evaluation.progress.annual");
  return { title: t("breakdown.title") };
}

export default async function AnnualRankingBreakdownPage({ params, searchParams }: PageProps) {
  await requireAdminUser();
  const t = await getTranslations("evaluation.progress.annual");
  const tCrumbs = await getTranslations("nav.breadcrumbs");

  const { sectionId: sectionIdRaw } = await params;
  const { year_id } = await searchParams;
  const sectionId = Number(sectionIdRaw);
  const yearId = Number(year_id);

  if (!Number.isInteger(sectionId) || sectionId <= 0) notFound();

  const baseCrumbs = [
    { label: tCrumbs("home"), href: "/dashboard" },
    { label: t("title"), href: LIST_HREF },
  ];

  if (!Number.isInteger(yearId) || yearId <= 0) {
    return (
      <div className="space-y-6">
        <DetailHeader title={t("breakdown.title")} breadcrumbs={[...baseCrumbs, { label: t("breakdown.title") }]} />
        <ErrorState kind="notFound" description={t("breakdown.paramsRequired")} />
      </div>
    );
  }

  let data: AnnualRankingSectionProgress;
  try {
    data = await getAnnualRankingSectionProgress(sectionId, yearId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    const failure = errorStateFromError(error);
    return (
      <div className="space-y-6">
        <DetailHeader title={t("breakdown.title")} breadcrumbs={[...baseCrumbs, { label: t("breakdown.title") }]} />
        <ErrorState kind={failure.kind} detail={failure.detail} retry />
      </div>
    );
  }

  const years = await listEcclesiasticalYears().catch(() => []);
  const yearLabel = resolveYearLabelById(years, yearId) ?? String(yearId);
  const formatNumber = await getFormatNumber();

  const status = recognitionStatus(data);
  const recognition =
    status.kind === "reached"
      ? status.name
      : status.kind === "missing"
        ? t("recognition.missing", {
            points: formatNumber(status.next.pointsToReach),
            tier: status.next.name,
          })
        : null;
  const summary = t("breakdown.summary", {
    year: yearLabel,
    earned: formatNumber(data.current_points),
    max: formatNumber(data.max_points),
  });

  const title = data.club_type.name ? `${data.club_name} · ${data.club_type.name}` : data.club_name;

  return (
    <div className="space-y-8">
      <DetailHeader
        title={title}
        subtitle={recognition ? `${summary} · ${recognition}` : summary}
        breadcrumbs={[...baseCrumbs, { label: data.club_name }]}
      />
      <AnnualRankingBreakdownView data={data} />
    </div>
  );
}
