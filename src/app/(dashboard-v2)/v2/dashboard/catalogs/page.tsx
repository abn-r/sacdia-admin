import { getTranslations } from "next-intl/server";
import { V2PageShell } from "@/components/v2/shared/v2-page-shell";
import { CatalogsHubPage } from "@/components/catalogs/catalogs-hub-page";

export default async function V2CatalogsPage() {
  const t = await getTranslations("catalogs.pages.root");

  return (
    <V2PageShell title={t("title")} description={t("description")} bleed>
      <CatalogsHubPage hidePageHeader />
    </V2PageShell>
  );
}
