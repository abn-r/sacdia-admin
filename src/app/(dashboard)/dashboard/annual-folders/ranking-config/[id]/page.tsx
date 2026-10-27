import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EditRankingConfigModalContent } from "@/components/annual-rankings/edit-ranking-config-modal-content";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";
import AnnualRankingConfigPage from "../page";

const ROUTE_BASE = "/dashboard/annual-folders/ranking-config";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * Direct load / refresh of an edit URL: the ranking-config list renders
 * underneath and the form opens as the same modal the intercepted route shows.
 */
export default async function EditAnnualRankingConfigPage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();
  const config = data.configs.find((item) => item.annual_ranking_config_id === id);

  if (!data.loadError && !config) {
    notFound();
  }

  return (
    <>
      <AnnualRankingConfigPage />
      <RouteFormModal
        title={t("editTitle")}
        description={t("editDescription")}
        className="sm:max-w-3xl"
        dismissHref={ROUTE_BASE}
      >
        <EditRankingConfigModalContent data={data} config={config!} />
      </RouteFormModal>
    </>
  );
}
