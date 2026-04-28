import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { MembershipRequestsClientPage } from "@/components/membership/membership-requests-client-page";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";

type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  club_type?: { name?: string } | null;
  name: string;
  active: boolean;
  club?: { club_id?: number; name?: string } | null;
};

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  sections?: ClubSection[];
};

type FetchResult = {
  sections: Array<{ club_section_id: number; label: string }>;
  available: boolean;
  error?: string;
};

async function fetchClubSections(): Promise<FetchResult> {
  try {
    const payload = await apiRequest<unknown>("/clubs");

    let clubs: Club[] = [];
    if (Array.isArray(payload)) {
      clubs = payload as Club[];
    } else if (payload && typeof payload === "object") {
      const res = payload as { data?: unknown };
      if (Array.isArray(res.data)) {
        clubs = res.data as Club[];
      }
    }

    const sections: Array<{ club_section_id: number; label: string }> = [];

    for (const club of clubs) {
      const clubName = club.name ?? "Club";
      for (const section of club.sections ?? []) {
        if (section.active && section.club_section_id) {
          const typeName = section.club_type?.name ?? section.name ?? "Sección";
          sections.push({
            club_section_id: section.club_section_id,
            label: `${clubName} — ${typeName}`,
          });
        }
      }
    }

    return { sections, available: true };
  } catch (error) {
    if (error instanceof ApiError) {
      return { sections: [], available: false, error: error.message };
    }
    return { sections: [], available: false, error: "Error inesperado" };
  }
}

export default async function MembershipRequestsPage() {
  await requireAdminUser();
  const result = await fetchClubSections();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de Membresía"
        description="Aprobación y rechazo de solicitudes de nuevos miembros en secciones de club."
      />

      {!result.available && (
        <EndpointErrorBanner
          state="missing"
          detail={result.error ?? "No se pudieron cargar los clubes"}
        />
      )}

      {result.available && result.sections.length === 0 && (
        <EmptyState
          icon={UserPlus}
          title="Sin secciones disponibles"
          description="No se encontraron secciones de club activas para gestionar solicitudes."
        />
      )}

      {result.available && result.sections.length > 0 && (
        <MembershipRequestsClientPage sections={result.sections} />
      )}
    </div>
  );
}
