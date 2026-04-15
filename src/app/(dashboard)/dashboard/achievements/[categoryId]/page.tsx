import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import {
  listAchievementsAdmin,
  listAchievementCategoriesAdmin,
  type AchievementListQuery,
} from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";
import { AchievementsCrudPage } from "@/app/(dashboard)/dashboard/achievements/_components/achievements-crud-page";
import {
  createAchievementAction,
  updateAchievementAction,
  deleteAchievementAction,
} from "@/lib/achievements/actions";

type Params = Promise<{ categoryId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type GenericRecord = Record<string, unknown>;

type Meta = {
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

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractItems(payload: unknown): GenericRecord[] {
  if (Array.isArray(payload)) return payload as GenericRecord[];
  const root = payload as Record<string, unknown> | null;
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data as GenericRecord[];
  const nested = root.data as Record<string, unknown> | null;
  if (nested && Array.isArray(nested.data)) return nested.data as GenericRecord[];
  if (nested && Array.isArray(nested.items)) return nested.items as GenericRecord[];
  return [];
}

function extractMeta(
  payload: unknown,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackTotal: number,
): Meta {
  const root = payload as Record<string, unknown> | null;
  const nestedData = root?.data as Record<string, unknown> | null;
  const metaRecord =
    (nestedData?.meta as Record<string, unknown> | null) ??
    (root?.meta as Record<string, unknown> | null) ??
    nestedData;

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

function pickCategoryName(items: GenericRecord[], categoryId: number): string {
  const match = items.find(
    (item) =>
      toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id) ===
      categoryId,
  );
  if (!match) return `Categoría ${categoryId}`;
  return toNonEmptyString(match.name) ?? `Categoría ${categoryId}`;
}

export default async function CategoryAchievementsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();

  const { categoryId: categoryIdRaw } = await params;
  const categoryId = toPositiveNumber(categoryIdRaw);
  if (!categoryId) {
    return (
      <EndpointErrorBanner
        state="missing"
        detail="No se encontró la categoría solicitada."
      />
    );
  }

  const rawSearchParams = await searchParams;
  const typeFilter = (readParam(rawSearchParams, "type") ?? "") || undefined;
  const activeRaw = readParam(rawSearchParams, "active");
  const active = activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const page = toPositiveNumber(readParam(rawSearchParams, "page")) ?? 1;
  const limit = toPositiveNumber(readParam(rawSearchParams, "limit")) ?? 20;

  let achievements: GenericRecord[] = [];
  let meta: Meta = { page, limit, total: 0, totalPages: 1 };
  let categoryName = `Categoría ${categoryId}`;
  let categories: { id: number; name: string }[] = [];
  let loadError: string | null = null;

  try {
    const [achievementsPayload, categoriesPayload] = await Promise.all([
      listAchievementsAdmin({
        categoryId: categoryId,
        type: typeFilter as AchievementListQuery["type"],
        active,
        page,
        limit,
      }),
      listAchievementCategoriesAdmin({ limit: 200 }),
    ]);

    achievements = extractItems(achievementsPayload);
    meta = extractMeta(achievementsPayload, page, limit, achievements.length);

    const catItems = extractItems(categoriesPayload);
    categoryName = pickCategoryName(catItems, categoryId);
    categories = catItems.map((item) => ({
      id: toPositiveNumber(item.achievement_category_id ?? item.category_id ?? item.id) ?? 0,
      name: toNonEmptyString(item.name) ?? "Sin nombre",
    })).filter((c) => c.id > 0);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      achievements = [];
    } else {
      loadError =
        error instanceof ApiError
          ? error.message
          : "No se pudieron cargar los logros.";
    }
  }

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <AchievementsCrudPage
        achievements={achievements}
        meta={meta}
        categoryId={categoryId}
        categoryName={categoryName}
        categories={categories}
        createAction={createAchievementAction}
        updateAction={updateAchievementAction}
        deleteAction={deleteAchievementAction}
      />
    </div>
  );
}
