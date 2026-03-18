import { Heart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireAdminUser } from "@/lib/auth/session";

export default async function InsurancePage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Seguros" description="Gestión de seguros de miembros.">
        <Badge variant="outline">Planificado</Badge>
      </PageHeader>
      <EmptyState
        icon={Heart}
        title="Módulo en desarrollo"
        description="El módulo de seguros está planificado y requiere contrato backend dedicado. Estará disponible próximamente."
      />
    </div>
  );
}
