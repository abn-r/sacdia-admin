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
import CategoryAchievementsPage from "../../page";

type Params = Promise<{ categoryId: string; achievementId: string }>;

/**
 * Direct load / refresh: the category's achievements list renders underneath
 * and the form opens as the same modal the intercepted route shows.
 */
export default async function EditAchievementPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailEdit");
  const { categoryId: categoryIdRaw, achievementId: achievementIdRaw } = await params;
  const data = await loadEditAchievementFormData(categoryIdRaw, achievementIdRaw);
  const listHref = achievementsListHref(data.categoryId);

  return (
    <>
      <CategoryAchievementsPage
        params={Promise.resolve({ categoryId: categoryIdRaw })}
        searchParams={Promise.resolve({})}
      />
      <RouteFormModal
        title={t("title")}
        description={data.achievementName}
        className="sm:max-w-3xl"
        dismissHref={listHref}
      >
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
            cancelHref={listHref}
          />
        ) : null}
      </RouteFormModal>
    </>
  );
}
