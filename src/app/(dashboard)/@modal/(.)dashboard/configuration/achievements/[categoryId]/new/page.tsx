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

type Params = Promise<{ categoryId: string }>;

export default async function NewAchievementModal({ params }: { params: Params }) {
  await requireAdminUser();
  const t = await getTranslations("achievements.pages.detailNew");
  const { categoryId: categoryIdRaw } = await params;
  const data = await loadCreateAchievementFormData(categoryIdRaw);

  return (
    <RouteFormModal
      title={t("title")}
      description={t("descriptionTemplate", { categoryName: data.categoryName })}
      className="sm:max-w-3xl"
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
        cancelHref={achievementsListHref(data.categoryId)}
      />
    </RouteFormModal>
  );
}
