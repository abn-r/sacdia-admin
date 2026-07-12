import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  DISTRICTS_CREATE,
  CATALOGS_CREATE,
} from "@/lib/auth/permissions";
import { listAdminLocalFields } from "@/lib/api/generic-catalogs-i18n";
import { createDistrictAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  DistrictFormPage,
  type LocalFieldOption,
} from "@/components/catalogs/district-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.districts");
  return { title: t("createTitle") };
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

export default async function DistrictsNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [DISTRICTS_CREATE, CATALOGS_CREATE]);
  if (!canCreate) {
    panelRedirect("/dashboard/catalogs/geography/districts");
  }

  let localFields: LocalFieldOption[] = [];
  try {
    const payload = await listAdminLocalFields();
    localFields = buildLocalFieldOptions(payload);
  } catch {
    // Silently degrade — form still renders, user just can't select a local field
  }

  return (
    <DistrictFormPage
      mode="create"
      localFields={localFields}
      action={createDistrictAction}
    />
  );
}
