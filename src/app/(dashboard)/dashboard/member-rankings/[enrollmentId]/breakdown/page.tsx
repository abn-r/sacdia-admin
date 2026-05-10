import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ApiError } from "@/lib/api/client";
import { getMemberBreakdown } from "@/lib/api/member-rankings";
import { getActiveEcclesiasticalYearId } from "@/lib/api/catalogs";
import { MemberRankingScoreBadge } from "@/app/(dashboard)/dashboard/member-rankings/_components/member-ranking-score-badge";
import { MemberBreakdownCard } from "./_components/member-breakdown-card";

// ─── Route params ─────────────────────────────────────────────────────────────

type Params = Promise<{ enrollmentId: string }>;
type SearchParams = Promise<{ year_id?: string }>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberBreakdownPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const t = await getTranslations("rankings");

  const { enrollmentId: enrollmentIdRaw } = await params;
  const { year_id: yearIdRaw } = await searchParams;

  const enrollmentId = Number(enrollmentIdRaw);
  if (!Number.isFinite(enrollmentId) || enrollmentId <= 0) {
    notFound();
  }

  const parsedYearId = yearIdRaw ? Number(yearIdRaw) : null;
  const queryYearId =
    parsedYearId !== null && Number.isFinite(parsedYearId) && parsedYearId > 0
      ? parsedYearId
      : null;
  const yearId = queryYearId ?? (await getActiveEcclesiasticalYearId());

  if (yearId === null) {
    notFound();
  }

  let data: Awaited<ReturnType<typeof getMemberBreakdown>>;
  try {
    data = await getMemberBreakdown(enrollmentId, yearId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const memberName = data.user?.name ?? `Miembro #${enrollmentId}`;
  const sectionName = data.club_section?.name ?? data.section?.name ?? "sección desconocida";

  // Maps investiture status raw strings to translated labels
  function investitureStatusLabel(status: string | null): string {
    if (!status) return t("pageMemberBreakdown.statusNoRecord");
    const map: Record<string, string> = {
      investido: t("pageMemberBreakdown.statusInvestido"),
      completed: t("pageMemberBreakdown.statusCompleted"),
      in_progress: t("pageMemberBreakdown.statusInProgress"),
      pending: t("pageMemberBreakdown.statusPending"),
      not_started: t("pageMemberBreakdown.statusNotStarted"),
    };
    return map[status.toLowerCase()] ?? status;
  }

  // Note: requires Node.js full-icu support (default in Node 22.x runtime)
  const calculatedAt = data.composite_calculated_at
    ? new Date(data.composite_calculated_at).toLocaleString("es-MX")
    : null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title={t("pageMemberBreakdown.titleDetail", { memberName })}
        description={t("pageMemberBreakdown.descriptionDetail", { sectionName, yearId })}
        breadcrumbs={[
          { label: t("pageMemberBreakdown.breadcrumbParent"), href: "/dashboard/member-rankings" },
          { label: memberName },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/member-rankings">
            <ArrowLeft className="size-4" />
            {t("pageMemberBreakdown.back")}
          </Link>
        </Button>
      </PageHeader>

      {/* ── Composite score summary ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("pageMemberBreakdown.position")}</p>
            <p className="text-2xl font-bold">
              {data.rank_position !== null ? `#${data.rank_position}` : "—"}
            </p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t("pageMemberBreakdown.compositeScore")}</p>
            <MemberRankingScoreBadge score={data.composite_score_pct} className="text-base" />
          </div>
          {data.awarded_category?.name && (
            <>
              <div className="h-10 w-px bg-border" />
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{t("pageMemberBreakdown.category")}</p>
                <p className="text-sm">{data.awarded_category.name}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Signal breakdown cards ── */}
      <div className="grid gap-6 md:grid-cols-3">
        <MemberBreakdownCard
          title={t("pageMemberBreakdown.titleClass")}
          score={data.class_score_pct}
          weight={data.weights.class_pct}
          breakdown={
            <>
              <p>
                {t("pageMemberBreakdown.sectionsCompleted")}{" "}
                <span className="font-medium text-foreground">
                  {data.class_breakdown.completed_sections} /{" "}
                  {data.class_breakdown.required_sections}
                </span>
              </p>
              {data.class_breakdown.folder_status && (
                <p>
                  {t("pageMemberBreakdown.folder")}{" "}
                  <span className="font-medium text-foreground">
                    {data.class_breakdown.folder_status}
                  </span>
                </p>
              )}
            </>
          }
        />

        <MemberBreakdownCard
          title={t("pageMemberBreakdown.titleInvestiture")}
          score={data.investiture_score_pct}
          weight={data.weights.investiture_pct}
          breakdown={
            <p>
              {t("pageMemberBreakdown.status")}{" "}
              <span className="font-medium text-foreground">
                {investitureStatusLabel(data.investiture_breakdown.status)}
              </span>
            </p>
          }
        />

        <MemberBreakdownCard
          title={t("pageMemberBreakdown.titleCamporee")}
          score={data.camporee_score_pct}
          weight={data.weights.camporee_pct}
          breakdown={
            <>
              <p>
                {t("pageMemberBreakdown.participation")}{" "}
                <span className="font-medium text-foreground">
                  {data.camporee_breakdown.participated
                    ? t("pageMemberBreakdown.yes")
                    : t("pageMemberBreakdown.no")}
                </span>
              </p>
              {data.camporee_breakdown.total_camporees !== null && (
                <p>
                  {t("pageMemberBreakdown.availableCamporees")}{" "}
                  <span className="font-medium text-foreground">
                    {data.camporee_breakdown.total_camporees}
                  </span>
                </p>
              )}
            </>
          }
        />
      </div>

      {/* ── Weights applied ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("pageMemberBreakdown.weightsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {t("pageMemberBreakdown.weightsSource")}:{" "}
            <span className="font-medium text-foreground">{data.weights.source}</span>
          </p>
          <p>
            {t("pageMemberBreakdown.titleClass")}{" "}
            <span className="font-medium text-foreground">{data.weights.class_pct}%</span>
            {" + "}{t("pageMemberBreakdown.titleInvestiture")}{" "}
            <span className="font-medium text-foreground">{data.weights.investiture_pct}%</span>
            {" + "}{t("pageMemberBreakdown.titleCamporee")}{" "}
            <span className="font-medium text-foreground">{data.weights.camporee_pct}%</span>
          </p>
        </CardContent>
      </Card>

      {/* ── Last calculated timestamp ── */}
      <p className="text-sm text-muted-foreground">
        {t("pageMemberBreakdown.lastCalculated")}{" "}
        {calculatedAt ?? <span className="italic">{t("pageMemberBreakdown.lastCalculatedNone")}</span>}
      </p>
    </div>
  );
}
