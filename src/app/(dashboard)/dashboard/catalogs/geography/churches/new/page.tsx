import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CHURCHES_CREATE,
  CATALOGS_CREATE,
} from "@/lib/auth/permissions";
import { listAdminDistricts } from "@/lib/api/generic-catalogs-i18n";
import { createChurchAction } from "@/lib/generic-catalogs-i18n/actions";
import {
  ChurchFormPage,
  type DistrictOption,
} from "@/components/catalogs/church-form-page";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.churches");
  return { title: t("createTitle") };
}

function buildDistrictOptions(payload: unknown): DistrictOption[] {
  const items = extractItems(payload);
  return items
    .map((item) => {
      const id =
        typeof item.districlub_type_id === "number"
          ? item.districlub_type_id
          : Number(item.districlub_type_id);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return { value: id, label: name };
    })
    .filter((x): x is DistrictOption => x !== null);
}

export default async function ChurchesNewPage() {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CHURCHES_CREATE, CATALOGS_CREATE]);
  if (!canCreate) {
    redirect("/dashboard/catalogs/geography/churches");
  }

  let districts: DistrictOption[] = [];
  try {
    const payload = await listAdminDistricts();
    districts = buildDistrictOptions(payload);
  } catch {
    // Silently degrade
  }

  return (
    <ChurchFormPage
      mode="create"
      districts={districts}
      action={createChurchAction}
    />
  );
}
