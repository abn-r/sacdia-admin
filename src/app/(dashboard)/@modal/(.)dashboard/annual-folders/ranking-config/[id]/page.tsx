import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RouteFormModal } from "@/components/shared/form-modal";
import { FormModalForbidden } from "@/components/shared/form-modal-forbidden";
import { EditRankingConfigModalContent } from "@/components/annual-rankings/edit-ranking-config-modal-content";
import { canViewScreen } from "@/lib/auth/screen-catalog";
import { requireAdminUser } from "@/lib/auth/session";
import { loadRankingConfigPageData } from "@/lib/annual-rankings/load-ranking-config-page-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditAnnualRankingConfigModal({ params }: PageProps) {
  const user = await requireAdminUser();
  const { id } = await params;
  const t = await getTranslations("annual_folders.pageRankingConfig");

  // Same gate as the full page: the screen's viewAny.
  if (!canViewScreen(user, "annual-folders-ranking-config")) {
    return (
      <FormModalForbidden
        title={t("editTitle")}
        description={t("editDescription")}
        className="sm:max-w-3xl"
      />
    );
  }

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
