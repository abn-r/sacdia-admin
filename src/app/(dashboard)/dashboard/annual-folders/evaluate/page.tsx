import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/shared/page-header";
import { EvaluationClientPage } from "@/components/annual-folders/evaluation-client-page";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function EvaluateFoldersPage() {
  await requireAdminUser();
  const t = await getTranslations("annual_folders");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("pageEvaluate.title")}
        description={t("pageEvaluate.description")}
      />

      <EvaluationClientPage />
    </div>
  );
}
