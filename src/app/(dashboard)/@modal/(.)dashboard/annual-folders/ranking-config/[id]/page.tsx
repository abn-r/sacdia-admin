import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { EditRankingConfigModalContent } from "@/components/annual-rankings/edit-ranking-config-modal-content";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAnnualRankingConfigModal({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations("annual_folders.pageRankingConfig");
  const data = await loadRankingConfigPageData();
  const config = data.configs.find((item) => item.annual_ranking_config_id === id);

  if (!data.loadError && !config) {
    notFound();
  }

  return (
    <RouteFormModal title={t("editTitle")} description={t("editDescription")} className="sm:max-w-3xl">
      <EditRankingConfigModalContent data={data} config={config!} />
    </RouteFormModal>
  );
}
