import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { UNIONS_UPDATE, CATALOGS_UPDATE } from "@/lib/auth/permissions";
import {
  getAdminUnion,
  listAdminCountries,
} from "@/lib/api/generic-catalogs-i18n";
import { updateUnionAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  UnionFormPage,
  type CountryOption,
  type UnionRecord,
} from "@/components/catalogs/union-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.unions");
  return { title: t("editTitle") };
}

function buildCountryOptions(payload: unknown): CountryOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.country_id === "number"
          ? item.country_id
          : Number(item.country_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is CountryOption => x !== null);
}

function toUnionRecord(raw: unknown): UnionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const id = typeof r.union_id === "number" ? r.union_id : Number(r.union_id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const translations = Array.isArray(r.translations)
    ? (r.translations as CatalogTranslation[])
    : [];

  return {
    union_id: id,
    name: typeof r.name === "string" ? r.name : "",
    abbreviation:
      typeof r.abbreviation === "string"
        ? r.abbreviation
        : (r.abbreviation as string | null | undefined) ?? null,
    country_id:
      typeof r.country_id === "number"
        ? r.country_id
        : Number(r.country_id) || null,
    active: r.active !== false,
    translations,
  };
}

export default async function UnionsEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [UNIONS_UPDATE, CATALOGS_UPDATE]);
  if (!canEdit) {
    panelRedirect("/dashboard/catalogs/geography/unions");
  }

  const { id: idParam } = await params;
  const numericId = Number(idParam);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const [rawUnion, rawCountries] = await Promise.allSettled([
    getAdminUnion(numericId),
    listAdminCountries(),
  ]);

  const item =
    rawUnion.status === "fulfilled" ? toUnionRecord(rawUnion.value) : null;

  if (!item) notFound();

  const countries =
    rawCountries.status === "fulfilled"
      ? buildCountryOptions(rawCountries.value)
      : [];

  return (
    <UnionFormPage
      mode="edit"
      item={item}
      countries={countries}
      action={updateUnionAction}
    />
  );
}
