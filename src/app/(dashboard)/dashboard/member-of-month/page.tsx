import { Trophy } from "lucide-react";
import { requireAdminUser } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { listClubTypes } from "@/lib/api/catalogs";
import { listLocalFields } from "@/lib/api/geography";
import { listAdminMemberOfMonth } from "@/lib/api/member-of-month";
import type { AdminMomFilters, AdminMomPage } from "@/lib/api/member-of-month";
import type { ClubType } from "@/lib/api/catalogs";
import type { LocalField } from "@/lib/api/geography";
import { MemberOfMonthSupervisionClient } from "./_components/member-of-month-supervision-client";

export const revalidate = 60;

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MemberOfMonthPageProps {
  searchParams: Promise<{
    club_type_id?: string;
    local_field_id?: string;
    club_id?: string;
    section_id?: string;
    year?: string;
    month?: string;
    notified?: string;
    page?: string;
  }>;
}

export default async function MemberOfMonthSupervisionPage({
  searchParams,
}: MemberOfMonthPageProps) {
  await requireAdminUser();

  const params = await searchParams;

  const currentYear = new Date().getFullYear();

  const filters: AdminMomFilters = {
    ...(params.club_type_id ? { club_type_id: Number(params.club_type_id) } : {}),
    ...(params.local_field_id ? { local_field_id: Number(params.local_field_id) } : {}),
    ...(params.club_id ? { club_id: Number(params.club_id) } : {}),
    ...(params.section_id ? { section_id: Number(params.section_id) } : {}),
    year: params.year ? Number(params.year) : currentYear,
    ...(params.month ? { month: Number(params.month) } : {}),
    ...(params.notified === "true"
      ? { notified: true }
      : params.notified === "false"
        ? { notified: false }
        : {}),
    page: params.page ? Number(params.page) : 1,
    limit: 20,
  };

  let clubTypes: ClubType[] = [];
  let localFields: LocalField[] = [];
  let momData: AdminMomPage = { total: 0, page: 1, limit: 20, items: [] };
  let loadError: string | null = null;

  const [clubTypesResult, localFieldsResult, momResult] =
    await Promise.allSettled([
      listClubTypes(),
      listLocalFields(),
      listAdminMemberOfMonth(filters),
    ]);

  if (clubTypesResult.status === "fulfilled") {
    clubTypes = clubTypesResult.value;
  }

  if (localFieldsResult.status === "fulfilled") {
    localFields = localFieldsResult.value;
  }

  if (momResult.status === "fulfilled") {
    momData = momResult.value;
  } else {
    console.error(
      "[MemberOfMonthSupervisionPage] Failed to load admin MoM list:",
      momResult.reason,
    );
    loadError =
      "No se pudieron cargar los ganadores. Verifica la conexion con el servidor.";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Miembro del Mes"
        description="Vista consolidada de ganadores por sección en todos los clubes."
        breadcrumbs={[
          { label: "Reportes", href: "/dashboard/reports" },
          { label: "Miembro del Mes" },
        ]}
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubTypes.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="Sin catalogos disponibles"
          description="No se pudieron cargar los tipos de club para los filtros."
        />
      )}

      {!loadError && (
        <MemberOfMonthSupervisionClient
          initialData={momData}
          clubTypes={clubTypes}
          localFields={localFields}
          searchParams={params}
        />
      )}
    </div>
  );
}
