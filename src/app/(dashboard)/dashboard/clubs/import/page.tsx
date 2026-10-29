import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations as getTranslationsStrict } from "next-intl/server";

type LooseTranslator = (key: string) => string;
const getTranslations = getTranslationsStrict as unknown as (
  namespace?: string,
) => Promise<LooseTranslator>;
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { canCreateClubs } from "@/lib/auth/permission-utils";
import { ClubsBulkImport } from "@/components/clubs/clubs-bulk-import";
import { bulkCreateClubsAction } from "@/lib/clubs/bulk-import-actions";
import { loadClubGeographyForTerritory } from "@/lib/clubs/territory-catalogs";

import type { CatalogOption } from "@/lib/clubs/bulk-import-parse";

type RawCatalogItem = Record<string, unknown>;

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toCatalogOptions(
  items: RawCatalogItem[],
  idField: string,
  parentField?: string,
): CatalogOption[] {
  return items.flatMap((item) => {
    const value = toPositiveNumber(item[idField]);
    if (!value) return [];
    const rawName = item.name;
    const name = typeof rawName === "string" ? rawName.trim() : String(rawName ?? "").trim();
    if (!name) return [];
    const parentId = parentField ? toPositiveNumber(item[parentField]) : null;
    return [{ label: name, value, parentId } satisfies CatalogOption];
  });
}

export default async function ImportClubsPage() {
  const user = await requireAdminUser();
  if (!canCreateClubs(user)) {
    redirect("/dashboard/clubs");
  }

  const t = await getTranslations("clubs.pages.import");
  const { localFields, districts, churches } = await loadClubGeographyForTerritory(user);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")}>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/clubs">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageHeader>

      <ClubsBulkImport
        localFields={toCatalogOptions(localFields, "local_field_id")}
        districts={toCatalogOptions(districts, "district_id", "local_field_id")}
        churches={toCatalogOptions(churches, "church_id", "district_id")}
        submitAction={bulkCreateClubsAction}
      />
    </div>
  );
}
