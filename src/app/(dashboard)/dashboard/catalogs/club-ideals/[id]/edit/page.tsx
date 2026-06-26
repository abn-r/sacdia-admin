import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CLUB_IDEALS_UPDATE,
  CATALOGS_UPDATE,
} from "@/lib/auth/permissions";
import {
  getAdminClubIdeal,
  listAdminClubTypes,
} from "@/lib/api/generic-catalogs-i18n";
import { updateClubIdealAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  ClubIdealFormPage,
  type ClubTypeOption,
  type ClubIdealRecord,
} from "@/components/catalogs/club-ideal-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.clubIdeals");
  return { title: t("editTitle") };
}

function buildClubTypeOptions(payload: unknown): ClubTypeOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.club_type_id === "number"
          ? item.club_type_id
          : Number(item.club_type_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is ClubTypeOption => x !== null);
}

/** Coerces an API response to ClubIdealRecord or null if invalid. */
function toClubIdealRecord(raw: unknown): ClubIdealRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Handle nested { data: ... } response shape
  const record =
    r.club_ideal_id != null
      ? r
      : (r.data as Record<string, unknown>) ?? r;

  const id =
    typeof record.club_ideal_id === "number"
      ? record.club_ideal_id
      : Number(record.club_ideal_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  const translations = Array.isArray(record.translations)
    ? (record.translations as CatalogTranslation[])
    : [];

  return {
    club_ideal_id: id,
    name: typeof record.name === "string" ? record.name : "",
    ideal:
      typeof record.ideal === "string"
        ? record.ideal
        : (record.ideal as string | null | undefined) ?? null,
    club_type_id:
      typeof record.club_type_id === "number"
        ? record.club_type_id
        : Number(record.club_type_id) || null,
    ideal_order:
      typeof record.ideal_order === "number"
        ? record.ideal_order
        : Number(record.ideal_order) || null,
    active: record.active !== false,
    translations,
  };
}

export default async function ClubIdealsEditPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CLUB_IDEALS_UPDATE, CATALOGS_UPDATE]);
  if (!canEdit) {
    redirect("/dashboard/catalogs/club-ideals");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  // Fetch club ideal + club types in parallel
  const [rawIdeal, rawClubTypes] = await Promise.allSettled([
    getAdminClubIdeal(numericId),
    listAdminClubTypes(),
  ]);

  const item =
    rawIdeal.status === "fulfilled"
      ? toClubIdealRecord(rawIdeal.value)
      : null;

  if (!item) notFound();

  const clubTypes =
    rawClubTypes.status === "fulfilled"
      ? buildClubTypeOptions(rawClubTypes.value)
      : [];

  return (
    <ClubIdealFormPage
      mode="edit"
      item={item}
      clubTypes={clubTypes}
      action={updateClubIdealAction}
    />
  );
}
