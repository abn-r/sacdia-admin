import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { NewRankingConfigModalContent } from "@/components/annual-rankings/new-ranking-config-modal-content";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";
import AnnualRankingConfigPage from "../page";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

/**
 * Direct load / refresh: the ranking-config list renders underneath and the
 * form opens as the same modal the intercepted route shows.
 */
export default async function NewAnnualRankingConfigPage() {
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();

  return (
    <>
      <AnnualRankingConfigPage />
      <RouteFormModal
        title={t("newTitle")}
        description={t("newDescription")}
        className="sm:max-w-3xl"
        dismissHref={ROUTE_BASE}
      >
        <NewRankingConfigModalContent data={data} />
      </RouteFormModal>
    </>
  );
}
