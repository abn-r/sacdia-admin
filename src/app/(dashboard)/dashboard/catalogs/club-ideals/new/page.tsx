import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CLUB_IDEALS_CREATE,
  CATALOGS_CREATE,
} from "@/lib/auth/permissions";
import { listAdminClubTypes } from "@/lib/api/generic-catalogs-i18n";
import { createClubIdealAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  ClubIdealFormPage,
  type ClubTypeOption,
} from "@/components/catalogs/club-ideal-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.clubIdeals");
  return { title: t("createTitle") };
}

function buildClubTypeOptions(payload: unknown): ClubTypeOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id = typeof item.club_type_id === "number" ? item.club_type_id : Number(item.club_type_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is ClubTypeOption => x !== null);
}

export default async function ClubIdealsNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CLUB_IDEALS_CREATE, CATALOGS_CREATE]);
  if (!canCreate) {
    redirect("/dashboard/catalogs/club-ideals");
  }

  let clubTypes: ClubTypeOption[] = [];
  try {
    const payload = await listAdminClubTypes();
    clubTypes = buildClubTypeOptions(payload);
  } catch {
    // Silently degrade — form still renders, user just can't select a club type
  }

  return (
    <ClubIdealFormPage
      mode="create"
      clubTypes={clubTypes}
      action={createClubIdealAction}
    />
  );
}
