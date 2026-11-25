import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UnionsPageClient } from "@/components/catalogs/unions/unions-page-client";
import { listAdminCountries } from "@/lib/api/admin-countries";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { listAdminUnions } from "@/lib/api/admin-unions";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminCountry } from "@/lib/catalogs/countries/types";
import type { AdminDivision } from "@/lib/catalogs/divisions/types";
import type { AdminUnionRow } from "@/lib/catalogs/unions/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.unions");
  return {
    title: t("title"),
    description: t("description"),
  };
}

function enrichUnions(
  unions: Awaited<ReturnType<typeof listAdminUnions>>,
  countries: AdminCountry[],
  divisions: AdminDivision[],
): AdminUnionRow[] {
  const countryMap = new Map(countries.map((country) => [country.country_id, country.name]));
  const divisionMap = new Map(divisions.map((division) => [division.division_id, division.name]));

  return unions.map((union) => ({
    ...union,
    country_name: countryMap.get(union.country_id) ?? `#${union.country_id}`,
    division_name: divisionMap.get(union.division_id) ?? `#${union.division_id}`,
  }));
}

export default async function UnionsPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let unions: AdminUnionRow[] = [];
  let countries: AdminCountry[] = [];
  let divisions: AdminDivision[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    const [unionRows, countryRows, divisionRows] = await Promise.all([
      listAdminUnions(),
      listAdminCountries(),
      listAdminDivisions(),
    ]);
    countries = countryRows;
    divisions = divisionRows;
    unions = enrichUnions(unionRows, countries, divisions);
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-unions", "create");
  const canEdit = canCapability(user, "catalogs-unions", "update");
  const canDelete = canCapability(user, "catalogs-unions", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.unions.title")} description={t("entities.unions.description")} />;
  }

  return (
    <>
      <UnionsPageClient
        unions={unions}
        countries={countries}
        divisions={divisions}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
