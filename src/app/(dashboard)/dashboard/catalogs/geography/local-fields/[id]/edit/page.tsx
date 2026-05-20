import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  LOCAL_FIELDS_UPDATE,
  CATALOGS_UPDATE,
} from "@/lib/auth/permissions";
import {
  getAdminLocalField,
  listAdminUnions,
} from "@/lib/api/generic-catalogs-i18n";
import { updateLocalFieldAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  LocalFieldFormPage,
  type LocalFieldRecord,
  type UnionOption,
} from "@/components/catalogs/local-field-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.localFields");
  return { title: t("editTitle") };
}

function buildUnionOptions(payload: unknown): UnionOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.union_id === "number" ? item.union_id : Number(item.union_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is UnionOption => x !== null);
}

function toLocalFieldRecord(raw: unknown): LocalFieldRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id =
    typeof r.local_field_id === "number"
      ? r.local_field_id
      : Number(r.local_field_id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const translations = Array.isArray(r.translations)
    ? (r.translations as CatalogTranslation[])
    : [];

  return {
    local_field_id: id,
    name: typeof r.name === "string" ? r.name : "",
    abbreviation:
      typeof r.abbreviation === "string"
        ? r.abbreviation
        : (r.abbreviation as string | null | undefined) ?? null,
    union_id:
      typeof r.union_id === "number"
        ? r.union_id
        : Number(r.union_id) || null,
    active: r.active !== false,
    translations,
  };
}

export default async function LocalFieldsEditPage({
  params,
}: {
  params: Params;
}) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [LOCAL_FIELDS_UPDATE, CATALOGS_UPDATE]);
  if (!canEdit) {
    redirect("/dashboard/catalogs/geography/local-fields");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const [rawLocalField, rawUnions] = await Promise.allSettled([
    getAdminLocalField(numericId),
    listAdminUnions(),
  ]);

  const item =
    rawLocalField.status === "fulfilled"
      ? toLocalFieldRecord(rawLocalField.value)
      : null;

  if (!item) notFound();

  const unions =
    rawUnions.status === "fulfilled" ? buildUnionOptions(rawUnions.value) : [];

  return (
    <LocalFieldFormPage
      mode="edit"
      item={item}
      unions={unions}
      action={updateLocalFieldAction}
    />
  );
}
