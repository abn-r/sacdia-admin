import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { FinancesClubSelector } from "@/components/finances/finances-club-selector";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  name: string;
  club_type?: { name?: string; slug?: string } | null;
};

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  active?: boolean;
  sections?: ClubSection[];
  [key: string]: unknown;
};

type ClubOption = {
  club_id: number;
  name: string;
  sections: ClubSection[];
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchClubs(): Promise<{ clubs: ClubOption[]; error?: string }> {
  try {
    const payload = await apiRequest<unknown>("/clubs");
    let raw: Club[] = [];

    if (Array.isArray(payload)) {
      raw = payload as Club[];
    } else if (payload && typeof payload === "object") {
      const res = payload as { data?: unknown };
      if (Array.isArray(res.data)) {
        raw = res.data as Club[];
      }
    }

    const clubs: ClubOption[] = raw
      .filter((c) => c.active !== false)
      .map((c) => ({
        club_id: Number(c.club_id ?? c.id),
        name: c.name ?? `Club ${c.club_id ?? c.id}`,
        sections: Array.isArray(c.sections) ? c.sections : [],
      }))
      .filter((c) => c.club_id > 0);

    return { clubs };
  } catch (error) {
    if (error instanceof ApiError) {
      return { clubs: [], error: error.message };
    }
    return { clubs: [], error: "Error inesperado al cargar los clubes" };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function FinancesPage() {
  await requireAdminUser();

  const { clubs, error } = await fetchClubs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Gestión de ingresos y egresos por club."
      />

      {error && (
        <EndpointErrorBanner
          state="missing"
          detail={error}
        />
      )}

      {!error && clubs.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No hay clubes disponibles"
          description="No se encontraron clubes activos. Creá un club primero para gestionar sus finanzas."
        />
      ) : (
        <FinancesClubSelector clubs={clubs} />
      )}
    </div>
  );
}
