import { requireAdminUser } from "@/lib/auth/session";
import { DivisionScoringCategoriesPage } from "@/components/scoring-categories/division-scoring-categories-page";

export default async function ScoringCategoriesSettingsPage() {
  await requireAdminUser();

  return <DivisionScoringCategoriesPage />;
}
