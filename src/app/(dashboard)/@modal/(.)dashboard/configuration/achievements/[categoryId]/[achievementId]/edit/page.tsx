import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { updateAchievementAction } from "@/lib/achievements/actions";
import {
  achievementsListHref,
  loadEditAchievementFormData,
} from "@/lib/achievements/achievement-form-data";
import { AchievementForm } from "@/app/(dashboard)/dashboard/configuration/achievements/_components/achievement-form";

type Params = Promise<{ categoryId: string; achievementId: string }>;

export default async function EditAchievementModal({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailEdit");
  const { categoryId: categoryIdRaw, achievementId: achievementIdRaw } = await params;
  const data = await loadEditAchievementFormData(categoryIdRaw, achievementIdRaw);

  return (
    <RouteFormModal title={t("title")} description={data.achievementName} className="sm:max-w-3xl">
      {data.loadError ? (
        <div className="px-6 pb-4">
          <EndpointErrorBanner state="missing" detail={data.loadError} />
        </div>
      ) : null}
      {data.achievement ? (
        <AchievementForm
          mode="edit"
          achievement={data.achievement}
          achievementId={data.achievementId}
          categoryId={data.categoryId}
          categories={data.categories}
          allAchievements={data.allAchievements}
          formAction={updateAchievementAction}
          actionState={{}}
          cancelHref={achievementsListHref(data.categoryId)}
        />
      ) : null}
    </RouteFormModal>
  );
}
