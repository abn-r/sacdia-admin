import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { NewRankingConfigModalContent } from "@/components/annual-rankings/new-ranking-config-modal-content";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export default async function NewAnnualRankingConfigModal() {
  const user = await requireAdminUser();
  const t = await getTranslations("annual_folders.pageRankingConfig");

  // Same gate as the full page: the screen's viewAny.
  if (!canViewScreen(user, "annual-folders-ranking-config")) {
    return (
      <FormModalForbidden
        title={t("newTitle")}
        description={t("newDescription")}
        className="sm:max-w-3xl"
      />
    );
  }

  const data = await loadRankingConfigPageData();

  return (
    <RouteFormModal title={t("newTitle")} description={t("newDescription")} className="sm:max-w-3xl">
      <NewRankingConfigModalContent data={data} />
    </RouteFormModal>
  );
}
