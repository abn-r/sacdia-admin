import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CatalogEditorForbidden } from "@/components/catalogs/catalog-editor-forbidden";
import { MasterHonorFormPage } from "@/components/catalogs/master-honor-form-page";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { listAdminDivisions } from "@/lib/api/admin-divisions";
import { listAdminHonorCategories } from "@/lib/api/admin-honor-categories";
import { listAdminHonorsCatalog } from "@/lib/api/admin-honors-catalog";
import { listAdminMasterHonors } from "@/lib/api/phase-e-catalogs";
import { requireAdminUser } from "@/lib/auth/session";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { catalogLoadFailure, type CatalogLoadFailure } from "@/lib/catalogs/load-failure";
import { normalizeMasterHonorsPayload } from "@/lib/catalogs/master-honors/normalize";
import { toCatalogTranslations } from "@/lib/catalogs/translations";
import {
  createMasterHonorAction,
  recalculateMasterHonorAction,
  updateMasterHonorAction,
} from "@/lib/phase-e-catalogs/actions";
import { extractItems } from "@/lib/phase-e-catalogs/fetch-helpers";

type Params = Promise<{ masterHonorId: string }>;

const LIST_HREF = "/dashboard/catalogs/master-honors";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.masterHonors");
  return { title: t("title") };
}

export default async function MasterHonorDetailPage({ params }: { params: Params }) {
  const user = await requireAdminUser();
  if (!canViewScreen(user, "catalogs-master-honors")) {
    return <CatalogEditorForbidden />;
  }

  const { masterHonorId: rawId } = await params;
  const isNew = rawId === "new";
  const id = isNew ? null : Number(rawId);
  if (!isNew && (!Number.isInteger(id) || (id ?? 0) <= 0)) notFound();

  const tNav = await getTranslations("nav.items");
  const t = await getTranslations("admin.catalogs.masterHonor");
  const tList = await getTranslations("catalogs.pages.masterHonors");

  const canCreate = canCapability(user, "catalogs-master-honors", "create");
  const canUpdate = canCapability(user, "catalogs-master-honors", "update");
  if (isNew ? !canCreate : !canUpdate) {
    return <CatalogEditorForbidden />;
  }

  let record: Record<string, unknown> | null = null;
  let failure: CatalogLoadFailure | null = null;
  let honors: { honor_id: number; name: string }[] = [];
  let categories: { honor_category_id: number; name: string }[] = [];
  let divisions: { division_id: number; name: string }[] = [];

  try {
    // The API has no GET by id: the admin list carries each master honor with its rules.
    const [payload, honorsResult, categoriesResult, divisionsResult] = await Promise.all([
      isNew ? Promise.resolve(null) : listAdminMasterHonors({ page: 1, limit: 500 }),
      listAdminHonorsCatalog().catch(() => []),
      listAdminHonorCategories({ page: 1, limit: 200 }).catch(() => ({ items: [] })),
      listAdminDivisions().catch(() => []),
    ]);
    if (payload) {
      record = extractItems(payload).find((item) => Number(item.master_honor_id) === id) ?? null;
    }
    honors = honorsResult.map((h) => ({ honor_id: h.honor_id, name: h.name }));
    categories = categoriesResult.items.map((c) => ({
      honor_category_id: c.honor_category_id,
      name: c.name,
    }));
    divisions = divisionsResult.map((d) => ({ division_id: d.division_id, name: d.name }));
  } catch (error) {
    failure = catalogLoadFailure(error);
  }

  if (!failure && !isNew && !record) notFound();

  const name = typeof record?.name === "string" ? record.name : "";
  const breadcrumbs = [
    { label: tNav("catalogs_root"), href: "/dashboard/catalogs" },
    { label: tList("title"), href: LIST_HREF },
    { label: isNew ? t("newTitle") : name },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={isNew ? t("newTitle") : name} breadcrumbs={breadcrumbs} />
      {failure ? (
        <ErrorState
          kind={failure.kind}
          retry
          {...(failure.detail ? { detail: failure.detail } : {})}
        />
      ) : (
        <MasterHonorFormPage
          mode={isNew ? "create" : "edit"}
          {...(id ? { masterHonorId: id } : {})}
          name={name}
          description={typeof record?.description === "string" ? record.description : ""}
          active={record?.active !== false}
          translations={toCatalogTranslations(
            Array.isArray(record?.translations)
              ? (record?.translations as { locale: string; name?: string | null }[])
              : [],
          )}
          payload={normalizeMasterHonorsPayload(record)}
          honors={honors}
          honorCategories={categories}
          divisions={divisions}
          listHref={LIST_HREF}
          saveAction={isNew ? createMasterHonorAction : updateMasterHonorAction}
          {...(isNew ? {} : { recalculateAction: recalculateMasterHonorAction })}
        />
      )}
    </div>
  );
}
