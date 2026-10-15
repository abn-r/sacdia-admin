import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NewRankingConfigModalContent } from "@/components/annual-rankings/new-ranking-config-modal-content";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

export default async function NewAnnualRankingConfigModal() {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();

  return (
    <RouteFormModal title={t("newTitle")} description={t("newDescription")} className="sm:max-w-3xl">
      <NewRankingConfigModalContent data={data} />
    </RouteFormModal>
  );
}
