import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { requireAdminUser } from "@/lib/auth/session";
import { createAchievementAction } from "@/lib/achievements/actions";
import {
  achievementsListHref,
  loadCreateAchievementFormData,
} from "@/lib/achievements/achievement-form-data";
import { AchievementForm } from "@/app/(dashboard)/dashboard/configuration/achievements/_components/achievement-form";
import CategoryAchievementsPage from "../page";

type Params = Promise<{ categoryId: string }>;

/**
 * Direct load / refresh: the category's achievements list renders underneath
 * and the form opens as the same modal the intercepted route shows.
 */
export default async function NewAchievementPage({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailNew");
  const { categoryId: categoryIdRaw } = await params;
  const data = await loadCreateAchievementFormData(categoryIdRaw);
  const listHref = achievementsListHref(data.categoryId);

  return (
    <>
      <CategoryAchievementsPage params={params} searchParams={Promise.resolve({})} />
      <RouteFormModal
        title={t("title")}
        description={t("descriptionTemplate", { categoryName: data.categoryName })}
        className="sm:max-w-3xl"
        dismissHref={listHref}
      >
        {data.loadError ? (
          <div className="px-6 pb-4">
            <EndpointErrorBanner state="missing" detail={data.loadError} />
          </div>
        ) : null}
        <AchievementForm
          mode="create"
          categoryId={data.categoryId}
          categories={data.categories}
          allAchievements={data.allAchievements}
          formAction={createAchievementAction}
          actionState={{}}
          cancelHref={listHref}
        />
      </RouteFormModal>
    </>
  );
}
