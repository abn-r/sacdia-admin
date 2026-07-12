import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { V2CatalogListShell } from "@/components/v2/catalogs/v2-catalog-list-shell";
import { CatalogEntityPage } from "@/components/catalogs/catalog-entity-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.ecclesiasticalYears");
  return { title: t("metadataTitle") };
}

export default async function V2EcclesiasticalYearsPage() {
  const t = await getTranslations("catalogs.pages.ecclesiasticalYears");

  return (
    <V2CatalogListShell title={t("title")} description={t("description")}>
      <CatalogEntityPage entityKey="ecclesiastical-years" hidePageHeader />
    </V2CatalogListShell>
  );
}
