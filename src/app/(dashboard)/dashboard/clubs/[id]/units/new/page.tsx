import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { UnitForm } from "@/components/units/unit-form";
import { requireAdminUser } from "@/lib/auth/session";
import { createUnitAction } from "@/lib/units/actions";
import { apiRequest, ApiError } from "@/lib/api/client";
import { listClubSections } from "@/lib/api/clubs";
import { toUnitSectionOptions } from "@/lib/units/section-options";
import type { UnitSectionOption } from "@/components/units/unit-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type Params = Promise<{ id: string }>;

type ClubMinimal = {
  club_id?: number;
  id?: number;
  name?: string;
  [key: string]: unknown;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NewUnitPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("clubs.pages.unitsNew");
  const { id } = await params;

  const clubId = Number(id);
  if (!Number.isFinite(clubId) || clubId <= 0) {
    notFound();
  }

  let clubName = "Club";
  let sectionOptions: UnitSectionOption[] = [];
  try {
    const [clubPayload, sectionsPayload] = await Promise.all([
      apiRequest<unknown>(`/clubs/${clubId}`),
      listClubSections(clubId),
    ]);
    const res = clubPayload as { data?: ClubMinimal } | ClubMinimal;
    const club = ("data" in res && res.data ? res.data : res) as ClubMinimal;
    clubName = club.name ?? "Club";
    sectionOptions = toUnitSectionOptions(sectionsPayload);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    // Non-critical — page still works without club name
  }

  const boundAction = createUnitAction.bind(null, clubId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("descriptionTemplate", { clubName })}>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/clubs/${clubId}`}>
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <UnitForm
        mode="create"
        clubId={clubId}
        sectionOptions={sectionOptions}
        formAction={boundAction}
      />
    </div>
  );
}
