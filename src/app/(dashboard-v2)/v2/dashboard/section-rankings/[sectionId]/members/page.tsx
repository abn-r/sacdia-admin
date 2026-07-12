import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { getSectionMembers } from "@/lib/api/section-rankings";
import { getActiveEcclesiasticalYearId } from "@/lib/api/catalogs";
import { SectionMembersTable } from "./_components/section-members-table";

// ─── Route params ─────────────────────────────────────────────────────────────

type Params = Promise<{ sectionId: string }>;
type SearchParams = Promise<{ year_id?: string }>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SectionMembersPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const t = await getTranslations("rankings");

  const { sectionId: sectionIdRaw } = await params;
  const { year_id: yearIdRaw } = await searchParams;

  // Validate sectionId
  const sectionId = Number(sectionIdRaw);
  if (!Number.isFinite(sectionId) || sectionId <= 0) {
    notFound();
  }

  // Validate + fallback yearId
  const parsedYearId = yearIdRaw ? Number(yearIdRaw) : null;
  const queryYearId =
    parsedYearId !== null && Number.isFinite(parsedYearId) && parsedYearId > 0
      ? parsedYearId
      : null;
  const yearId = queryYearId ?? (await getActiveEcclesiasticalYearId());

  if (yearId === null) {
    notFound();
  }

  let members: Awaited<ReturnType<typeof getSectionMembers>>;
  try {
    members = await getSectionMembers(sectionId, yearId);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 403)
    ) {
      notFound();
    }
    throw error;
  }

  const memberLabel =
    members.length === 1
      ? t("pageSectionMembers.memberSingular")
      : t("pageSectionMembers.memberPlural");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title={t("pageSectionMembers.title")}
        description={t("pageSectionMembers.description", {
          sectionId,
          yearId,
          count: members.length,
          memberLabel,
        })}
        breadcrumbs={[
          {
            label: t("pageSectionMembers.breadcrumbParent"),
            href: "/dashboard/section-rankings",
          },
          { label: t("pageSectionMembers.breadcrumbCurrent", { sectionId }) },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/section-rankings">
            <ArrowLeft className="size-4" />
            {t("pageSectionMembers.back")}
          </Link>
        </Button>
      </PageHeader>

      {/* ── Members table ── */}
      <SectionMembersTable data={members} yearId={yearId} />
    </div>
  );
}
