import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  getAchievementById,
  listAchievementsAdmin,
  listAchievementCategoriesAdmin,
} from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";
import { updateAchievementAction } from "@/lib/achievements/actions";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { Skeleton } from "@/components/ui/skeleton";

const AchievementForm = dynamic(
  () =>
    import(
      "@/app/(dashboard)/dashboard/achievements/_components/achievement-form"
    ).then((m) => ({ default: m.AchievementForm })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <div className="flex justify-end gap-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
    ),
  },
);

type Params = Promise<{ categoryId: string; achievementId: string }>;

type GenericRecord = Record<string, unknown>;

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

export default async function EditAchievementPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailEdit");

  const { categoryId: categoryIdRaw, achievementId: achievementIdRaw } = await params;
  const categoryId = toPositiveNumber(categoryIdRaw);
  const achievementId = toPositiveNumber(achievementIdRaw);

  if (!categoryId || !achievementId) notFound();

  const defaultName = t("defaultName");
  const defaultCategoryName = t("defaultCategoryName", { id: categoryId });
  const defaultAchievementName = t("defaultAchievementName", { id: achievementId });

  let achievement: GenericRecord | null = null;
  let categories: { id: number; name: string }[] = [];
  let allAchievements: { id: number; name: string }[] = [];
  let categoryName = defaultCategoryName;
  let loadError: string | null = null;

  try {
    const [achPayload, catsPayload, achsPayload] = await Promise.all([
      getAchievementById(achievementId),
      listAchievementCategoriesAdmin({ limit: 200 }),
      listAchievementsAdmin({ limit: 500 }),
    ]);

    achievement = achPayload as GenericRecord;

    const catItems = extractItems(catsPayload);
    categories = catItems
      .map((item) => ({
        id:
          toPositiveNumber(
            item.achievement_category_id ?? item.category_id ?? item.id,
          ) ?? 0,
        name: toNonEmptyString(item.name) ?? defaultName,
      }))
      .filter((c) => c.id > 0);

    const match = catItems.find(
      (item) =>
        toPositiveNumber(
          item.achievement_category_id ?? item.category_id ?? item.id,
        ) === categoryId,
    );
    if (match) categoryName = toNonEmptyString(match.name) ?? categoryName;

    const achItems = extractItems(achsPayload);
    allAchievements = achItems
      .map((item) => ({
        id: toPositiveNumber(item.achievement_id ?? item.id) ?? 0,
        name: toNonEmptyString(item.name) ?? defaultName,
      }))
      .filter((a) => a.id > 0);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError =
        error instanceof ApiError
          ? error.message
          : t("loadError");
    }
  }

  if (!achievement && !loadError) notFound();

  const cancelHref = `/dashboard/achievements/${categoryId}`;
  const achievementName =
    toNonEmptyString(achievement?.name) ?? defaultAchievementName;

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <PageHeader
        title={t("title")}
        description={achievementName}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard/achievements" },
          { label: categoryName, href: cancelHref },
          { label: achievementName },
        ]}
      />

      {achievement && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <AchievementForm
            mode="edit"
            achievement={achievement}
            achievementId={achievementId}
            categoryId={categoryId}
            categories={categories}
            allAchievements={allAchievements}
            formAction={updateAchievementAction}
            actionState={{}}
            cancelHref={cancelHref}
          />
        </div>
      )}
    </div>
  );
}
