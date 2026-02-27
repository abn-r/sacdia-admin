import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";

export default async function ActivitiesPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades"
        description="Gestión de actividades por club."
      />
      <EmptyState
        icon={Calendar}
        title="Selecciona un club"
        description="Las actividades se gestionan por club. Selecciona un club desde la sección de clubes para ver sus actividades."
      />
    </div>
  );
}
