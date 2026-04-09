import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EditClubForm } from "@/components/clubs/edit-club-form";
import { ClubSectionsPanel } from "@/components/clubs/club-sections-panel";
import { PendingMembersPanel } from "@/components/membership/pending-members-panel";
import { UnitsTab } from "@/components/units/units-tab";
import { apiRequest, ApiError } from "@/lib/api/client";
import { requireAdminUser } from "@/lib/auth/session";
import { getSelectOptions } from "@/lib/catalogs/service";
import { updateClubAction, deleteClubAction } from "@/lib/clubs/actions";
import type { ClubActionState } from "@/lib/clubs/actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string }>;

type Club = {
  club_id?: number;
  id?: number;
  name?: string;
  description?: string | null;
  active?: boolean;
  local_field_id?: number;
  district_id?: number;
  church_id?: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { lat?: number; lng?: number } | null;
  local_field?: { name?: string } | null;
  district?: { name?: string } | null;
  church?: { name?: string } | null;
  sections?: Array<{
    club_section_id?: number;
    club_type_id?: number;
    club_type?: { name?: string } | null;
    name?: string;
    active?: boolean;
    souls_target?: number | null;
    fee?: number | null;
    members_count?: number;
  }>;
  [key: string]: unknown;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="min-w-[160px] text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

function ClubViewCard({ club }: { club: Club }) {
  const lat = (club.coordinates as { lat?: number } | null)?.lat ?? club.latitude;
  const lng = (club.coordinates as { lng?: number } | null)?.lng ?? club.longitude;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Nombre" value={club.name} />
          <InfoRow label="Descripción" value={club.description} />
          <InfoRow
            label="Estado"
            value={
              <Badge variant={club.active !== false ? "default" : "outline"}>
                {club.active !== false ? "Activo" : "Inactivo"}
              </Badge>
            }
          />
          <InfoRow label="Campo local" value={club.local_field?.name} />
          <InfoRow label="Distrito" value={club.district?.name} />
          <InfoRow label="Iglesia" value={club.church?.name} />
          <InfoRow label="Dirección" value={club.address} />
          {(lat != null || lng != null) && (
            <InfoRow label="Coordenadas" value={`${lat ?? "—"}, ${lng ?? "—"}`} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const VALID_TABS = ["view", "edit", "sections", "units", "membership"] as const;
type ValidTab = (typeof VALID_TABS)[number];

function resolveTab(raw: string | undefined): ValidTab {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) {
    return raw as ValidTab;
  }
  return "view";
}

export default async function ClubDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireAdminUser();
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const defaultTab = resolveTab(tabParam);

  let club: Club;
  try {
    const payload = await apiRequest<unknown>(`/clubs/${id}`);
    const res = payload as { data?: Club; status?: string } | Club;
    club = ("data" in res && res.data && typeof res.data === "object" ? res.data : res) as Club;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  const clubId = Number(club.club_id ?? club.id ?? id);
  const clubName = club.name ?? "Club";
  const sections = club.sections ?? [];

  const [localFields, districts, churches] = await Promise.all([
    getSelectOptions("local-fields").catch(() => []),
    getSelectOptions("districts").catch(() => []),
    getSelectOptions("churches").catch(() => []),
  ]);

  const boundUpdateAction = updateClubAction.bind(null, clubId);

  return (
    <div className="space-y-6">
      <PageHeader title={clubName}>
        <div className="flex gap-2">
          <form action={deleteClubAction}>
            <input type="hidden" name="id" value={clubId} />
            <Button variant="destructive" size="sm" type="submit">
              Eliminar
            </Button>
          </form>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/clubs">
              <ArrowLeft className="mr-2 size-4" />
              Volver
            </Link>
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="view">Ver</TabsTrigger>
          <TabsTrigger value="edit">Editar</TabsTrigger>
          <TabsTrigger value="sections">Secciones ({sections.length})</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="membership">Solicitudes de membresía</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="mt-4">
          <ClubViewCard club={club} />
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <EditClubForm
            club={club}
            localFields={localFields}
            districts={districts}
            churches={churches}
            formAction={boundUpdateAction}
          />
        </TabsContent>

        <TabsContent value="sections" className="mt-4 space-y-4">
          <ClubSectionsPanel clubId={clubId} sections={sections} />
        </TabsContent>

        <TabsContent value="units" className="mt-4">
          <UnitsTab clubId={clubId} />
        </TabsContent>

        <TabsContent value="membership" className="mt-4 space-y-4">
          <PendingMembersPanel sections={sections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
