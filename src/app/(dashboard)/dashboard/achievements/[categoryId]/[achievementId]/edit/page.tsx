import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import {
  getAchievementById,
  listAchievementsAdmin,
  listAchievementCategoriesAdmin,
} from "@/lib/api/achievements";
import { requireAdminUser } from "@/lib/auth/session";
import { updateAchievementAction } from "@/lib/achievements/actions";
import { AchievementForm } from "@/app/(dashboard)/dashboard/achievements/_components/achievement-form";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";

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

  const { categoryId: categoryIdRaw, achievementId: achievementIdRaw } = await params;
  const categoryId = toPositiveNumber(categoryIdRaw);
  const achievementId = toPositiveNumber(achievementIdRaw);

  if (!categoryId || !achievementId) notFound();

  let achievement: GenericRecord | null = null;
  let categories: { id: number; name: string }[] = [];
  let allAchievements: { id: number; name: string }[] = [];
  let categoryName = `Categoría ${categoryId}`;
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
        name: toNonEmptyString(item.name) ?? "Sin nombre",
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
        name: toNonEmptyString(item.name) ?? "Sin nombre",
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
          : "No se pudieron cargar los datos del logro.";
    }
  }

  if (!achievement && !loadError) notFound();

  const cancelHref = `/dashboard/achievements/${categoryId}`;
  const achievementName =
    toNonEmptyString(achievement?.name) ?? `Logro ${achievementId}`;

  return (
    <div className="space-y-6">
      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      <PageHeader
        title="Editar logro"
        description={achievementName}
        breadcrumbs={[
          { label: "Logros", href: "/dashboard/achievements" },
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
