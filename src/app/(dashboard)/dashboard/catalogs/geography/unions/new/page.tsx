import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import { UNIONS_CREATE, CATALOGS_CREATE } from "@/lib/auth/permissions";
import { listAdminCountries } from "@/lib/api/generic-catalogs-i18n";
import { createUnionAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  UnionFormPage,
  type CountryOption,
} from "@/components/catalogs/union-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.unions");
  return { title: t("createTitle") };
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

export default async function UnionsNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [UNIONS_CREATE, CATALOGS_CREATE]);
  if (!canCreate) {
    redirect("/dashboard/catalogs/geography/unions");
  }

  let countries: CountryOption[] = [];
  try {
    const payload = await listAdminCountries();
    countries = buildCountryOptions(payload);
  } catch {
    // Silently degrade
  }

  return (
    <UnionFormPage
      mode="create"
      countries={countries}
      action={createUnionAction}
    />
  );
}
