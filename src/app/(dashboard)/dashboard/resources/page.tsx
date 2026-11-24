import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { PageHeader } from "@/components/shared/page-header";
import { UrlTabs, type UrlTabItem } from "@/components/shared/url-tabs";
import { ResourceCategoriesCrudPage } from "@/components/resources/resource-categories-crud-page";
import { ResourcesCrudPage } from "@/components/resources/resources-crud-page";
import {
  extractItems,
  loadResourceFormData,
  toLoadFailure,
  toPositiveNumber,
} from "@/components/resources/resource-form-data";
import type { ResourcesLoadFailure } from "@/components/resources/resource-meta";
import { listResources, type ResourceType, type ScopeLevel } from "@/lib/api/resources";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { pageResourceCategories, parseCategoryStatus } from "@/lib/resources/category-list";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GenericRecord = Record<string, unknown>;
type Tab = "library" | "categories";

type PageMeta = { page: number; limit: number; total: number; totalPages: number };

const VALID_RESOURCE_TYPES: ResourceType[] = ["document", "audio", "image", "video_link", "text"];
const VALID_SCOPE_LEVELS: ScopeLevel[] = ["system", "division", "union", "local_field"];

function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find((entry) => typeof entry === "string");
  return undefined;
}

function readPositiveNumber(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): number | undefined {
  const value = readParam(raw, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as GenericRecord;
}

function extractMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): PageMeta {
  const root = toRecord(payload);
  const nestedData = toRecord(root?.data);
  const metaRecord = toRecord(nestedData?.meta) ?? toRecord(root?.meta) ?? nestedData;

  const page = toPositiveNumber(metaRecord?.page) ?? fallbackPage;
  const limit = toPositiveNumber(metaRecord?.limit) ?? fallbackLimit;
  const total =
    toPositiveNumber(metaRecord?.total) ?? toPositiveNumber(metaRecord?.count) ?? fallbackTotal;
  const totalPages =
    toPositiveNumber(metaRecord?.totalPages) ??
    toPositiveNumber(metaRecord?.total_pages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { page, limit, total, totalPages };
}

export default async function ResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdminUser();
  const t = await getTranslations("ops.resources");
  const tPages = await getTranslations("resources.pages");

  const canLibrary = canViewScreen(user, "resources-list");
  const canCategories = canViewScreen(user, "resources-categories");

  if (!canLibrary && !canCategories) {
    return <EndpointErrorBanner state="forbidden" detail={tPages("list.forbiddenDetail")} />;
  }

  const raw = await searchParams;
  const page = readPositiveNumber(raw, "page") ?? 1;
  const limit = readPositiveNumber(raw, "limit") ?? 20;
  const requestedTab = readParam(raw, "tab");
  const tab: Tab =
    requestedTab === "categories" && canCategories
      ? "categories"
      : canLibrary
        ? "library"
        : "categories";

  const rawType = readParam(raw, "resource_type");
  const resourceType = VALID_RESOURCE_TYPES.includes(rawType as ResourceType)
    ? (rawType as ResourceType)
    : undefined;
  const rawScope = readParam(raw, "scope_level");
  const scopeLevel = VALID_SCOPE_LEVELS.includes(rawScope as ScopeLevel)
    ? (rawScope as ScopeLevel)
    : undefined;
  const clubTypeId = readPositiveNumber(raw, "club_type_id");
  const categoryId = readPositiveNumber(raw, "category_id");
  const search = readParam(raw, "search");
  const hasLibraryFilters = Boolean(resourceType || scopeLevel || clubTypeId || categoryId || search);

  const formData = await loadResourceFormData(user);

  let items: GenericRecord[] = [];
  let meta: PageMeta = { page, limit, total: 0, totalPages: 1 };
  let libraryFailure: ResourcesLoadFailure | null = null;
  let libraryTotal: number | null = null;

  if (tab === "library") {
    try {
      const payload = await listResources({
        page,
        limit,
        resource_type: resourceType,
        resource_category_id: categoryId,
        club_type_id: clubTypeId,
        scope_level: scopeLevel,
        search,
      });
      items = extractItems(payload);
      meta = extractMeta(payload, page, limit, items.length);
      if (!hasLibraryFilters) libraryTotal = meta.total;
    } catch (error) {
      libraryFailure = toLoadFailure(error);
    }
  }

  // The tab count is the unfiltered total of the library: ask for it when this render
  // is filtered or shows the other tab.
  if (libraryTotal === null && canLibrary && !libraryFailure) {
    try {
      const payload = await listResources({ page: 1, limit: 1 });
      libraryTotal = extractMeta(payload, 1, 1, extractItems(payload).length).total;
    } catch {
      libraryTotal = null;
    }
  }

  const categoryTotal = formData.categoriesFailure ? null : formData.categoryRecords.length;

  let categoryItems: GenericRecord[] = [];
  let categoryMeta: PageMeta = { page, limit, total: 0, totalPages: 1 };
  if (tab === "categories" && !formData.categoriesFailure) {
    ({ items: categoryItems, meta: categoryMeta } = pageResourceCategories(
      formData.categoryRecords,
      {
        status: parseCategoryStatus(readParam(raw, "active")),
        search,
        page,
        limit,
      },
    ));
  }

  const canCreate = canCapability(user, "resources-list", "create");
  const tabs: UrlTabItem[] = [];
  if (canLibrary) {
    tabs.push({
      value: "library",
      label: t("tabs.library"),
      ...(libraryTotal !== null ? { count: libraryTotal } : {}),
      href: "/dashboard/resources",
    });
  }
  if (canCategories) {
    tabs.push({
      value: "categories",
      label: t("tabs.categories"),
      ...(categoryTotal !== null ? { count: categoryTotal } : {}),
      href: "/dashboard/resources?tab=categories",
    });
  }

  const description =
    libraryTotal !== null && categoryTotal !== null
      ? t("summary", { resources: libraryTotal, categories: categoryTotal })
      : t("description");

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={description}>
        {tab === "library" && canCreate && (
          <Button asChild>
            <Link href="/dashboard/resources/new">
              <Upload aria-hidden />
              {t("actions.upload")}
            </Link>
          </Button>
        )}
      </PageHeader>

      {tabs.length > 1 && (
        <UrlTabs tabs={tabs} defaultValue={tabs[0]?.value ?? "library"} ariaLabel={t("tabs.aria")} />
      )}

      {tab === "library" ? (
        <ResourcesCrudPage
          items={items}
          meta={meta}
          categories={formData.categories}
          clubTypes={formData.clubTypes}
          unions={formData.unions}
          localFields={formData.localFields}
          canCreate={canCreate}
          canEdit={canCapability(user, "resources-list", "update")}
          canDelete={canCapability(user, "resources-list", "delete")}
          loadError={libraryFailure}
          loadedAt={new Date().toISOString()}
        />
      ) : (
        <ResourceCategoriesCrudPage
          items={categoryItems}
          meta={categoryMeta}
          canCreate={canCapability(user, "resources-categories", "create")}
          canEdit={canCapability(user, "resources-categories", "update")}
          canDelete={canCapability(user, "resources-categories", "delete")}
          loadError={formData.categoriesFailure}
        />
      )}
    </div>
  );
}
