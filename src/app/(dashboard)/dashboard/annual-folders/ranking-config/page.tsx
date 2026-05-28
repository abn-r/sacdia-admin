import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AnnualRankingConfigClientPage } from "@/components/annual-rankings/annual-ranking-config-client-page";
import { ApiError } from "@/lib/api/client";
import {
  listAnnualRankingConfigs,
  listRankingTiers,
  type AnnualRankingConfig,
  type RankingTier,
} from "@/lib/api/annual-rankings";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";
import { listLocalFields } from "@/lib/api/geography";
import type { LocalField } from "@/lib/api/geography";
import { requireAdminUser } from "@/lib/auth/session";

export default async function AnnualRankingConfigPage() {
  await requireAdminUser();

  let loadError: string | null = null;
  let configs: AnnualRankingConfig[] = [];
  let tiers: RankingTier[] = [];
  let localFields: LocalField[] = [];
  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];

  const [configsResult, tiersResult, localFieldsResult, clubTypesResult, yearsResult] =
    await Promise.allSettled([
      listAnnualRankingConfigs(),
      listRankingTiers(),
      listLocalFields(),
      listClubTypes(),
      listEcclesiasticalYears(),
    ]);

  if (configsResult.status === "fulfilled") configs = configsResult.value;
  if (tiersResult.status === "fulfilled") tiers = tiersResult.value;
  if (localFieldsResult.status === "fulfilled") localFields = localFieldsResult.value;
  if (clubTypesResult.status === "fulfilled") clubTypes = clubTypesResult.value;
  if (yearsResult.status === "fulfilled") ecclesiasticalYears = yearsResult.value;

  const firstRejected = [
    configsResult,
    tiersResult,
    localFieldsResult,
    clubTypesResult,
    yearsResult,
  ].find((result) => result.status === "rejected");

  if (firstRejected?.status === "rejected") {
    loadError =
      firstRejected.reason instanceof ApiError
        ? firstRejected.reason.message
        : "No se pudo cargar la configuración anual de rankings.";
  }

  const missingCatalogs =
    localFields.length === 0 || clubTypes.length === 0 || ecclesiasticalYears.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración anual de rankings"
        description="Administrá rangos globales y presupuestos de puntos por campo local, año y tipo de club."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Carpeta anual", href: "/dashboard/annual-folders" },
          { label: "Configuración de rankings" },
        ]}
      />

      {loadError && <EndpointErrorBanner state="missing" detail={loadError} />}

      {!loadError && missingCatalogs && (
        <EmptyState
          icon={Settings2}
          title="Faltan catálogos para configurar rankings"
          description="Necesitás al menos un campo local, un tipo de club y un año eclesiástico activo."
        />
      )}

      {!loadError && !missingCatalogs && (
        <AnnualRankingConfigClientPage
          initialConfigs={configs}
          initialTiers={tiers}
          localFields={localFields}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
        />
      )}
    </div>
  );
}
