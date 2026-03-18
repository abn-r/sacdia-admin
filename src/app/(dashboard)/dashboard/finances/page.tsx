import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";

export default async function FinancesPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Gestión financiera por club."
      />
      <EmptyState
        icon={DollarSign}
        title="Selecciona un club"
        description="Los movimientos financieros se gestionan por club. Selecciona un club desde la sección de clubes para ver sus finanzas."
      />
    </div>
  );
}
