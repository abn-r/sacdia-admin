import { redirect } from "next/navigation";

import { canCapability } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
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
  if (!canCapability(user, "clubs", "bulk_create")) {
    redirect("/dashboard/clubs");
  }

  const { localFields, districts, churches } = await loadClubGeographyForTerritory(user);

  // The wizard renders its own header (breadcrumbs + the current step).
  return (
    <ClubsBulkImport
      localFields={toCatalogOptions(localFields, "local_field_id")}
      districts={toCatalogOptions(districts, "district_id", "local_field_id")}
      churches={toCatalogOptions(churches, "church_id", "district_id")}
      submitAction={bulkCreateClubsAction}
    />
  );
}
