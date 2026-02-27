import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";

export default async function InventoryPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Gestión de inventario por club."
      />
      <EmptyState
        icon={Package}
        title="Selecciona un club"
        description="El inventario se gestiona por club. Selecciona un club desde la sección de clubes para ver su inventario."
      />
    </div>
  );
}
