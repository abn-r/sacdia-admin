import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CHURCHES_UPDATE,
  CATALOGS_UPDATE,
} from "@/lib/auth/permissions";
import {
  getAdminChurch,
  listAdminDistricts,
} from "@/lib/api/generic-catalogs-i18n";
import { updateChurchAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  ChurchFormPage,
  type ChurchRecord,
  type DistrictOption,
} from "@/components/catalogs/church-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.churches");
  return { title: t("editTitle") };
}

function buildDistrictOptions(payload: unknown): DistrictOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.districlub_type_id === "number"
          ? item.districlub_type_id
          : Number(item.districlub_type_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is DistrictOption => x !== null);
}

function toChurchRecord(raw: unknown): ChurchRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id =
    typeof r.church_id === "number" ? r.church_id : Number(r.church_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  const translations = Array.isArray(r.translations)
    ? (r.translations as CatalogTranslation[])
    : [];

  return {
    church_id: id,
    name: typeof r.name === "string" ? r.name : "",
    district_id:
      typeof r.district_id === "number"
        ? r.district_id
        : Number(r.district_id) || null,
    active: r.active !== false,
    translations,
  };
}

export default async function ChurchesEditPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CHURCHES_UPDATE, CATALOGS_UPDATE]);
  if (!canEdit) {
    panelRedirect("/dashboard/catalogs/geography/churches");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const [rawChurch, rawDistricts] = await Promise.allSettled([
    getAdminChurch(numericId),
    listAdminDistricts(),
  ]);

  const item =
    rawChurch.status === "fulfilled" ? toChurchRecord(rawChurch.value) : null;

  if (!item) notFound();

  const districts =
    rawDistricts.status === "fulfilled"
      ? buildDistrictOptions(rawDistricts.value)
      : [];

  return (
    <ChurchFormPage
      mode="edit"
      item={item}
      districts={districts}
      action={updateChurchAction}
    />
  );
}
