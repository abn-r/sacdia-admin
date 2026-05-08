import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdminUser } from "@/lib/auth/session";
import { DivisionScoringCategoriesPage } from "@/components/scoring-categories/division-scoring-categories-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings.pages.scoringCategories");
  return { title: t("metadataTitle") };
}

export default async function ScoringCategoriesSettingsPage() {
  await requireAdminUser();

  return <DivisionScoringCategoriesPage />;
}
