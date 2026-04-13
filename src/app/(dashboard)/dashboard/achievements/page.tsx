import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ApiError } from "@/lib/api/client";
import { listAchievementCategoriesAdmin } from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";
import { AchievementCategoriesCrudPage } from "@/app/(dashboard)/dashboard/achievements/_components/achievement-categories-crud-page";
import {
  createAchievementCategoryAction,
  updateAchievementCategoryAction,
  deleteAchievementCategoryAction,
} from "@/lib/achievements/actions";

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

function extractMeta(payload: unknown, fallbackPage: number, fallbackLimit: number, fallbackTotal: number): Meta {
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

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdminUser();

  const rawSearchParams = await searchParams;
  const search = toNonEmptyString(readParam(rawSearchParams, "search") ?? "") ?? undefined;
  const activeRaw = readParam(rawSearchParams, "active");
  const active = activeRaw === "true" ? true : activeRaw === "false" ? false : undefined;
  const page = toPositiveNumber(readParam(rawSearchParams, "page")) ?? 1;
  const limit = toPositiveNumber(readParam(rawSearchParams, "limit")) ?? 20;

  let items: GenericRecord[] = [];
  let meta: Meta = { page, limit, total: 0, totalPages: 1 };
  let loadError: string | null = null;

  try {
    const payload = await listAchievementCategoriesAdmin({ search, active, page, limit });
    items = extractItems(payload);
    meta = extractMeta(payload, page, limit, items.length);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      items = [];
    } else {
      loadError =
        error instanceof ApiError
          ? error.message
          : "No se pudieron cargar las categorías de logros.";
    }
  }

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}
      <AchievementCategoriesCrudPage
        items={items}
        meta={meta}
        createAction={createAchievementCategoryAction}
        updateAction={updateAchievementCategoryAction}
        deleteAction={deleteAchievementCategoryAction}
      />
    </div>
  );
}
