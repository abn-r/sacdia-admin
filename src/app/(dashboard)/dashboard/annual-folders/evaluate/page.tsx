import { PageHeader } from "@/components/shared/page-header";
import { EvaluationClientPage } from "@/components/annual-folders/evaluation-client-page";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function EvaluateFoldersPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluación de Carpetas"
        description="Busca una carpeta por su ID y califica cada sección con los puntos correspondientes."
      />

      <EvaluationClientPage />
    </div>
  );
}
