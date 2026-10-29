import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { MemberBreakdownView } from "@/components/rankings/member-breakdown-view";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { getMemberBreakdown, type MemberBreakdown } from "@/lib/api/member-rankings";

interface PageProps {
  params: Promise<{ enrollmentId: string }>;
  searchParams: Promise<{ year_id?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("rankings");
  return { title: t("pageMemberBreakdown.title") };
}

export default async function MemberBreakdownPage({ params, searchParams }: PageProps) {
  await requireAdminUser();
  const t = await getTranslations("rankings");

  const { enrollmentId: enrollmentIdRaw } = await params;
  const { year_id } = await searchParams;
  const enrollmentId = Number(enrollmentIdRaw);
  const yearId = Number(year_id);

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) notFound();
  if (!Number.isInteger(yearId) || yearId <= 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {t("pageMemberBreakdown.paramsRequired")}
      </div>
    );
  }

  let data: MemberBreakdown | null = null;
  let loadError: string | null = null;
  try {
    data = await getMemberBreakdown(enrollmentId, yearId);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    loadError = t("pageMemberBreakdown.errorFallback");
  }

  const memberName = data?.user?.name ?? t("pageMemberBreakdown.title");
  const sectionName = data?.club_section?.name ?? null;
  const sectionId = data?.club_section?.section_id ?? null;
  const sectionMembersHref = sectionId
    ? `/dashboard/section-rankings/${sectionId}/members?year_id=${yearId}${
        sectionName ? `&section_name=${encodeURIComponent(sectionName)}` : ""
      }`
    : "/dashboard/section-rankings";

  return (
    <div className="space-y-6">
      <PageHeader
        title={memberName}
        description={sectionName ? t("pageMemberBreakdown.descriptionDetail", { sectionName }) : undefined}
        breadcrumbs={[
          { label: t("pageMemberBreakdown.breadcrumbParent"), href: "/dashboard/section-rankings" },
          ...(sectionName ? [{ label: sectionName, href: sectionMembersHref }] : []),
          { label: memberName },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={sectionMembersHref}>
            <ArrowLeft className="size-4" />
            {t("pageMemberBreakdown.back")}
          </Link>
        </Button>
      </PageHeader>

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {data && <MemberBreakdownView data={data} />}
    </div>
  );
}
