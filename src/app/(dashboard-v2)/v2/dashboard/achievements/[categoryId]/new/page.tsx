import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api/client";
import {
  listAchievementsAdmin,
  listAchievementCategoriesAdmin,
} from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";
import { createAchievementAction } from "@/lib/achievements/actions";
import { AchievementForm } from "@/app/(dashboard)/dashboard/achievements/_components/achievement-form";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

type Params = Promise<{ categoryId: string }>;

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

export default async function NewAchievementPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailNew");

  const { categoryId: categoryIdRaw } = await params;
  const categoryId = toPositiveNumber(categoryIdRaw);
  if (!categoryId) notFound();

  const defaultName = t("defaultName");
  const defaultCategoryName = t("defaultCategoryName", { id: categoryId });

  let categories: { id: number; name: string }[] = [];
  let allAchievements: { id: number; name: string }[] = [];
  let categoryName = defaultCategoryName;
  let loadError: string | null = null;

  try {
    const [catsPayload, achsPayload] = await Promise.all([
      listAchievementCategoriesAdmin({ limit: 200 }),
      listAchievementsAdmin({ limit: 500 }),
    ]);

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
    if (!(error instanceof ApiError && error.status === 429)) {
      loadError =
        error instanceof ApiError
          ? error.message
          : t("loadError");
    }
  }

  const cancelHref = `/dashboard/achievements/${categoryId}`;

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <PageHeader
        title={t("title")}
        description={t("descriptionTemplate", { categoryName })}
        breadcrumbs={[
          { label: t("breadcrumbRoot"), href: "/dashboard/achievements" },
          { label: categoryName, href: cancelHref },
          { label: t("breadcrumbNew") },
        ]}
      />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <AchievementForm
          mode="create"
          categoryId={categoryId}
          categories={categories}
          allAchievements={allAchievements}
          formAction={createAchievementAction}
          actionState={{}}
          cancelHref={cancelHref}
        />
      </div>
    </div>
  );
}
