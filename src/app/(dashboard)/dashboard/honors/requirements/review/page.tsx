import { getTranslations } from "next-intl/server";
import {
  getPendingReview,
  listHonorCategories,
  listHonors,
  type Honor,
  type HonorCategory,
  type PaginatedResponse,
  type ReviewFilters,
  type ReviewRequirement,
} from "@/lib/api/honors";
import { requireAdminUser } from "@/lib/auth/session";
import ReviewClient, {
  DEFAULT_LIMIT,
} from "./_components/review-client";

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  const v = value as Record<string, unknown> | null | undefined;
  if (v && Array.isArray(v.data)) return v.data as T[];
  return [];
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function parseOptionalId(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const t = await getTranslations("honors.pages.requirementsReview");

  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const limitParam = Array.isArray(params.limit)
    ? params.limit[0]
    : params.limit;
  const honorParam = Array.isArray(params.honor)
    ? params.honor[0]
    : params.honor;
  const categoryParam = Array.isArray(params.category)
    ? params.category[0]
    : params.category;

  const initialPage = parsePositiveInt(pageParam, 1);
  const initialLimit = parsePositiveInt(limitParam, DEFAULT_LIMIT);
  const honorId = parseOptionalId(honorParam);
  const categoryId = parseOptionalId(categoryParam);

  const filters: ReviewFilters = {};
  if (honorId !== undefined) filters.honorId = honorId;
  if (categoryId !== undefined) filters.categoryId = categoryId;

  let initialData: PaginatedResponse<ReviewRequirement> | null = null;
  let initialError: string | null = null;
  let honors: Honor[] = [];
  let categories: HonorCategory[] = [];

  const [reviewResult, honorsResult, categoriesResult] = await Promise.allSettled([
    getPendingReview(initialPage, initialLimit, filters),
    listHonors({ limit: 200 }),
    listHonorCategories(),
  ]);

  if (reviewResult.status === "fulfilled") {
    initialData = reviewResult.value as PaginatedResponse<ReviewRequirement>;
  } else {
    initialError =
      reviewResult.reason instanceof Error
        ? reviewResult.reason.message
        : t("loadError");
  }

  if (honorsResult.status === "fulfilled") {
    honors = normalizeArray<Honor>(honorsResult.value);
  }

  if (categoriesResult.status === "fulfilled") {
    categories = normalizeArray<HonorCategory>(categoriesResult.value);
  }

  return (
    <ReviewClient
      initialData={initialData}
      initialError={initialError}
      initialPage={initialPage}
      initialLimit={initialLimit}
      initialFilters={{ honorId, categoryId }}
      honors={honors}
      categories={categories}
    />
  );
}
