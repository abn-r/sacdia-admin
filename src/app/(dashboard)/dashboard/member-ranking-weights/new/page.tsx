import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdminUser } from "@/lib/auth/session";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { WeightsForm } from "../_components/weights-form";

const BACK_HREF = "/dashboard/member-ranking-weights";

export default async function NewWeightsPage() {
  await requireAdminUser();

  const [clubTypes, ecclesiasticalYears] = await Promise.all([
    listClubTypes().catch(() => []),
    listEcclesiasticalYears().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nueva sobreescritura de pesos"
        description="Define los porcentajes de clase, investidura y campaña para una combinación específica de tipo de club y año eclesiástico."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Pesos de ranking", href: BACK_HREF },
          { label: "Nueva sobreescritura" },
        ]}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={BACK_HREF}>
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </Button>
      </PageHeader>

      <WeightsForm
        mode="create"
        clubTypes={clubTypes}
        ecclesiasticalYears={ecclesiasticalYears}
        backHref={BACK_HREF}
      />
    </div>
  );
}
