import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CatalogEntityPage } from "@/components/catalogs/catalog-entity-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalogs.pages.unions");
  return { title: t("metadataTitle") };
}

export default function UnionsPage() {
  return <CatalogEntityPage entityKey="unions" />;
}
