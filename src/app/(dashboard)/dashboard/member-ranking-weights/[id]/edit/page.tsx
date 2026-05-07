import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { requireAdminUser } from "@/lib/auth/session";
import { getMemberRankingWeights } from "@/lib/api/member-ranking-weights";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { WeightsForm } from "../../_components/weights-form";

const BACK_HREF = "/dashboard/member-ranking-weights";

interface EditWeightsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWeightsPage({ params }: EditWeightsPageProps) {
  const { id } = await params;

  await requireAdminUser();

  let weightRow;
  let loadError: string | null = null;

  try {
    weightRow = await getMemberRankingWeights(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    loadError = err instanceof ApiError ? err.message : "Error al cargar la configuración";
  }

  const [clubTypes, ecclesiasticalYears] = await Promise.all([
    listClubTypes().catch(() => []),
    listEcclesiasticalYears().catch(() => []),
  ]);

  const isDefault = weightRow?.is_default ?? false;
  const pageTitle = isDefault
    ? "Editar configuración por defecto"
    : "Editar sobreescritura de pesos";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={pageTitle}
        description="Modifica los porcentajes de clase, investidura y campaña. La suma debe ser exactamente 100."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Pesos de ranking", href: BACK_HREF },
          { label: isDefault ? "Configuración por defecto" : "Editar sobreescritura" },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={BACK_HREF}>
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      {loadError && (
        <EmptyState
          icon={Scale}
          title="No se pudo cargar la configuración"
          description={loadError}
        />
      )}

      {!loadError && weightRow && (
        <WeightsForm
          mode="edit"
          defaultValues={weightRow}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          backHref={BACK_HREF}
        />
      )}
    </div>
  );
}
