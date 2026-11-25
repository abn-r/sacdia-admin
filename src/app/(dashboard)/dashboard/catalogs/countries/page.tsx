import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CountriesPageClient } from "@/components/catalogs/countries/countries-page-client";
import { listAdminCountries } from "@/lib/api/admin-countries";
import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { CatalogLoadError } from "@/components/catalogs/catalog-load-error";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { loadCatalogEditorSession } from "@/lib/auth/catalog-editor-session";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AdminCountry } from "@/lib/catalogs/countries/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.entities.countries");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CountriesPage() {
  const { user, allowed } = await loadCatalogEditorSession();
  if (!allowed) {
    return <CatalogEditorForbidden />;
  }
  const t = await getTranslations("catalogs");

  let countries: AdminCountry[] = [];
  let loadFailure: CatalogLoadFailure | null = null;

  try {
    countries = await listAdminCountries();
  } catch (error) {
    loadFailure = catalogLoadFailure(error);
  }

  const canCreate = canCapability(user, "catalogs-countries", "create");
  const canEdit = canCapability(user, "catalogs-countries", "update");
  const canDelete = canCapability(user, "catalogs-countries", "delete");

  if (loadFailure) {
    return <CatalogLoadError failure={loadFailure} title={t("entities.countries.title")} description={t("entities.countries.description")} />;
  }

  return (
    <>
      <CountriesPageClient
        countries={countries}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}
