import { ResourceCategoriesCrudPage } from "@/components/resources/resource-categories-crud-page";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import { listResourceCategories } from "@/lib/api/resources";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import {
  createResourceCategoryAction,
  deleteResourceCategoryAction,
  updateResourceCategoryAction,
} from "@/lib/resources/category-actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GenericRecord = Record<string, unknown>;

type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function readParam(
  raw: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = raw[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.find((e) => typeof e === "string");
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

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toRecord(value: unknown): GenericRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as GenericRecord;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  const root = toRecord(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as GenericRecord[];
  const nestedData = toRecord(root.data);
  if (nestedData && Array.isArray(nestedData.data)) return nestedData.data as GenericRecord[];
  if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as GenericRecord[];
  return [];
}

function extractMeta(payload: unknown, fallbackPage: number, fallbackLimit: number, fallbackTotal: number): PageMeta {
  const root = toRecord(payload);
  const nestedData = toRecord(root?.data);
  const metaRecord = toRecord(nestedData?.meta) ?? toRecord(root?.meta) ?? nestedData;

  const page = toPositiveNumber(metaRecord?.page) ?? fallbackPage;
  const limit = toPositiveNumber(metaRecord?.limit) ?? fallbackLimit;
  const total =
    toPositiveNumber(metaRecord?.total) ??
    toPositiveNumber(metaRecord?.count) ??
    fallbackTotal;
  const totalPages =
    toPositiveNumber(metaRecord?.totalPages) ??
    toPositiveNumber(metaRecord?.total_pages) ??
    Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return { page, limit, total, totalPages };
}

export default async function ResourceCategoriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAdminUser();
  const t = await getTranslations("resources.pages.categories");

  if (!canViewScreen(user, "resources-categories")) {
    return (
      <EndpointErrorBanner
        state="forbidden"
        detail={t("forbiddenDetail")}
      />
    );
  }

  const raw = await searchParams;
  const page = readPositiveNumber(raw, "page") ?? 1;
  const limit = readPositiveNumber(raw, "limit") ?? 20;

  let items: GenericRecord[] = [];
  let meta: PageMeta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const payload = await listResourceCategories({ page, limit });
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      items = [];
    } else {
      loadError =
        error instanceof ApiError
          ? error.message
          : "No se pudieron cargar las categorías de recursos.";
    }
  }

  const canCreate = canCapability(user, "resources-categories", "create");
  const canEdit = canCapability(user, "resources-categories", "update");
  const canDelete = canCapability(user, "resources-categories", "delete");

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <ResourceCategoriesCrudPage
        items={items}
        meta={meta}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        createAction={createResourceCategoryAction}
        updateAction={updateResourceCategoryAction}
        deleteAction={deleteResourceCategoryAction}
      />
    </div>
  );
}
