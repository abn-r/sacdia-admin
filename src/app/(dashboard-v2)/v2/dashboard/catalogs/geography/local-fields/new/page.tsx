import type { Metadata } from "next";
import { panelRedirect } from "@/lib/v2/panel-path-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  LOCAL_FIELDS_CREATE,
  CATALOGS_CREATE,
} from "@/lib/auth/permissions";
import { listAdminUnions } from "@/lib/api/generic-catalogs-i18n";
import { createLocalFieldAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  LocalFieldFormPage,
  type UnionOption,
} from "@/components/catalogs/local-field-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.localFields");
  return { title: t("createTitle") };
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

export default async function LocalFieldsNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [
    LOCAL_FIELDS_CREATE,
    CATALOGS_CREATE,
  ]);
  if (!canCreate) {
    panelRedirect("/dashboard/catalogs/geography/local-fields");
  }

  let unions: UnionOption[] = [];
  try {
    const payload = await listAdminUnions();
    unions = buildUnionOptions(payload);
  } catch {
    // Silently degrade
  }

  return (
    <LocalFieldFormPage
      mode="create"
      unions={unions}
      action={createLocalFieldAction}
    />
  );
}
