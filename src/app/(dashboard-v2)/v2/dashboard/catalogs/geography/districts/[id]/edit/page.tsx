import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  DISTRICTS_UPDATE,
  CATALOGS_UPDATE,
} from "@/lib/auth/permissions";
import {
  getAdminDistrict,
  listAdminLocalFields,
} from "@/lib/api/generic-catalogs-i18n";
import { updateDistrictAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  DistrictFormPage,
  type DistrictRecord,
  type LocalFieldOption,
} from "@/components/catalogs/district-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.districts");
  return { title: t("editTitle") };
}

function buildLocalFieldOptions(payload: unknown): LocalFieldOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.local_field_id === "number"
          ? item.local_field_id
          : Number(item.local_field_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is LocalFieldOption => x !== null);
}

function toDistrictRecord(raw: unknown): DistrictRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id =
    typeof r.districlub_type_id === "number"
      ? r.districlub_type_id
      : Number(r.districlub_type_id);

  if (!Number.isFinite(id) || id <= 0) return null;

  const translations = Array.isArray(r.translations)
    ? (r.translations as CatalogTranslation[])
    : [];

  return {
    districlub_type_id: id,
    name: typeof r.name === "string" ? r.name : "",
    local_field_id:
      typeof r.local_field_id === "number"
        ? r.local_field_id
        : Number(r.local_field_id) || null,
    active: r.active !== false,
    translations,
  };
}

export default async function DistrictsEditPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [DISTRICTS_UPDATE, CATALOGS_UPDATE]);
  if (!canEdit) {
    panelRedirect("/dashboard/catalogs/geography/districts");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const [rawDistrict, rawLocalFields] = await Promise.allSettled([
    getAdminDistrict(numericId),
    listAdminLocalFields(),
  ]);

  const item =
    rawDistrict.status === "fulfilled"
      ? toDistrictRecord(rawDistrict.value)
      : null;

  if (!item) notFound();

  const localFields =
    rawLocalFields.status === "fulfilled"
      ? buildLocalFieldOptions(rawLocalFields.value)
      : [];

  return (
    <DistrictFormPage
      mode="edit"
      item={item}
      localFields={localFields}
      action={updateDistrictAction}
    />
  );
}
