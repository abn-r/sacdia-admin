import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { RankingsClientPage } from "@/components/annual-folders/rankings-client-page";
import { requireAdminUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api/client";
import { listClubTypes, listEcclesiasticalYears } from "@/lib/api/catalogs";
import { getRankings, getAwardCategories } from "@/lib/api/annual-folders";
import type { ClubRanking, AwardCategory } from "@/lib/api/annual-folders";
import type { ClubType, EcclesiasticalYear } from "@/lib/api/catalogs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function RankingsPage() {
  await requireAdminUser();

  let clubTypes: ClubType[] = [];
  let ecclesiasticalYears: EcclesiasticalYear[] = [];
  let initialRankings: ClubRanking[] = [];
  let initialCategories: AwardCategory[] = [];
  let loadError: string | null = null;

  // Load catalogs
  const [clubTypesResult, yearsResult] = await Promise.allSettled([
    listClubTypes(),
    listEcclesiasticalYears(),
  ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = Array.isArray(clubTypesResult.value)
      ? clubTypesResult.value
      : (extractArray(clubTypesResult.value) as ClubType[]);
  }

  if (yearsResult.status === "fulfilled") {
    ecclesiasticalYears = Array.isArray(yearsResult.value)
      ? yearsResult.value
      : (extractArray(yearsResult.value) as EcclesiasticalYear[]);
  }

  if (clubTypes.length === 0 || ecclesiasticalYears.length === 0) {
    loadError =
      "No se pudieron cargar los tipos de club o anos eclesiasticos. Verifica la conexion con el servidor.";
  }

  // Pick sensible defaults: first club type, active year (or first)
  const defaultClubTypeId = clubTypes[0]?.club_type_id ?? 1;
  const defaultYearId =
    ecclesiasticalYears.find((y) => y.active)?.ecclesiastical_year_id ??
    ecclesiasticalYears[0]?.ecclesiastical_year_id ??
    1;

  if (!loadError) {
    const [rankingsResult, categoriesResult] = await Promise.allSettled([
      getRankings(defaultClubTypeId, defaultYearId),
      getAwardCategories(defaultClubTypeId, true, "club", false),
    ]);

    if (rankingsResult.status === "fulfilled") {
      initialRankings = Array.isArray(rankingsResult.value)
        ? rankingsResult.value
        : (extractArray(rankingsResult.value) as ClubRanking[]);
    }

    if (categoriesResult.status === "fulfilled") {
      initialCategories = Array.isArray(categoriesResult.value)
        ? categoriesResult.value
        : (extractArray(categoriesResult.value) as AwardCategory[]);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rankings de carpeta anual"
        description="Consulta el ranking de clubes por puntos obtenidos en la carpeta anual."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubTypes.length === 0 && (
        <EmptyState
          icon={TrendingUp}
          title="Sin datos de catalogo"
          description="No hay tipos de club disponibles para mostrar rankings."
        />
      )}

      {!loadError && clubTypes.length > 0 && (
        <RankingsClientPage
          initialRankings={initialRankings}
          initialCategories={initialCategories}
          clubTypes={clubTypes}
          ecclesiasticalYears={ecclesiasticalYears}
          initialClubTypeId={defaultClubTypeId}
          initialYearId={defaultYearId}
        />
      )}
    </div>
  );
}
