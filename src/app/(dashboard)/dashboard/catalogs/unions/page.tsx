import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UnionsPageClient } from "@/components/catalogs/unions/unions-page-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { listAdminCountries } from "@/lib/api/admin-countries";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { listAdminUnions } from "@/lib/api/admin-unions";
import { ApiError } from "@/lib/api/client";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CATALOGS_CREATE,
  CATALOGS_DELETE,
  CATALOGS_UPDATE,
  UNIONS_CREATE,
  UNIONS_DELETE,
  UNIONS_UPDATE,
} from "@/lib/auth/permissions";
import { requireAdminUser } from "@/lib/auth/session";
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
  const user = await requireAdminUser();
  const t = await getTranslations("catalogs");

  let unions: AdminUnionRow[] = [];
  let countries: AdminCountry[] = [];
  let divisions: AdminDivision[] = [];
  let loadError: string | null = null;

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
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError = error instanceof ApiError ? error.message : t("errors.load_data_failed");
    }
  }

  const canCreate = hasAnyPermission(user, [UNIONS_CREATE, CATALOGS_CREATE]);
  const canEdit = hasAnyPermission(user, [UNIONS_UPDATE, CATALOGS_UPDATE]);
  const canDelete = hasAnyPermission(user, [UNIONS_DELETE, CATALOGS_DELETE]);

  return (
    <>
      {loadError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t("errors.load_data_failed")}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}
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
