import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarRange, MapPin, DollarSign, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { CamporeeInfoCard } from "@/components/camporees/camporee-info-card";
import { CamporeeDetailActions } from "@/components/camporees/camporee-detail-actions";
import { CamporeeMembersTab } from "@/components/camporees/camporee-members-tab";
import { ApiError } from "@/lib/api/client";
import { getCamporeeById, listCamporeeMembers } from "@/lib/api/camporees";
import { requireAdminUser } from "@/lib/auth/session";
import type { Camporee, CamporeeMember } from "@/lib/api/camporees";

type Params = Promise<{ id: string }>;
type AnyRecord = Record<string, unknown>;

// ─── Normalizers ───────────────────────────────────────────────────────────────

function toPositiveNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractCamporee(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.camporee_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }
  if (root.camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.camporee_id ?? raw.id) ?? undefined,
    id: toPositiveNumber(raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    description: toText(raw.description),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined,
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    local_camporee_place: toText(raw.local_camporee_place) ?? undefined,
    registration_cost:
      typeof raw.registration_cost === "number" ? raw.registration_cost : undefined,
    active: raw.active !== false,
  };
}

function extractMembers(payload: unknown): CamporeeMember[] {
  if (Array.isArray(payload)) return payload as CamporeeMember[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as CamporeeMember[];
  }
  return [];
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex min-w-[180px] items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5 shrink-0" />}
        {label}
      </span>
      <span className="text-sm">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function CamporeeDetailPage({ params }: { params: Params }) {
  await requireAdminUser();

  const { id } = await params;
  const camporeeId = toPositiveNumber(id);
  if (!camporeeId) notFound();

  let camporee: Camporee;
  let members: CamporeeMember[] = [];
  let membersError: string | null = null;

  // Fetch camporee detail
  try {
    const payload = await getCamporeeById(camporeeId);
    const raw = extractCamporee(payload);
    if (!raw) notFound();
    camporee = normalizeCamporee(raw);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Fetch members — best effort
  try {
    const membersPayload = await listCamporeeMembers(camporeeId);
    members = extractMembers(membersPayload);
  } catch (err) {
    membersError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la lista de miembros.";
  }

  return (
    <div className="space-y-6">
      <PageHeader title={camporee.name} description="Detalle del camporee">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/camporees">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
        <CamporeeDetailActions camporee={camporee} />
      </PageHeader>

      {/* Summary card */}
      <CamporeeInfoCard camporee={camporee} />

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="members">
            Miembros
            {members.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {members.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Información ── */}
        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles del camporee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                label="ID"
                value={camporee.camporee_id ?? camporee.id}
                icon={Hash}
              />
              <InfoRow
                label="Fecha de inicio"
                value={formatDate(camporee.start_date)}
                icon={CalendarRange}
              />
              <InfoRow
                label="Fecha de fin"
                value={formatDate(camporee.end_date)}
                icon={CalendarRange}
              />
              <InfoRow
                label="Lugar"
                value={camporee.local_camporee_place ?? "—"}
                icon={MapPin}
              />
              <InfoRow
                label="Costo de inscripción"
                value={
                  camporee.registration_cost != null
                    ? camporee.registration_cost.toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                        minimumFractionDigits: 2,
                      })
                    : "—"
                }
                icon={DollarSign}
              />
              <InfoRow
                label="Campo local ID"
                value={camporee.local_field_id ?? "—"}
                icon={Hash}
              />
              <InfoRow
                label="Incluye"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {camporee.includes_adventurers && (
                      <Badge variant="secondary">Aventureros</Badge>
                    )}
                    {camporee.includes_pathfinders && (
                      <Badge variant="secondary">Conquistadores</Badge>
                    )}
                    {camporee.includes_master_guides && (
                      <Badge variant="secondary">Guías Mayores</Badge>
                    )}
                    {!camporee.includes_adventurers &&
                      !camporee.includes_pathfinders &&
                      !camporee.includes_master_guides && (
                        <span className="text-muted-foreground">—</span>
                      )}
                  </div>
                }
              />
              {camporee.description && (
                <InfoRow label="Descripción" value={camporee.description} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Miembros ── */}
        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Miembros inscritos</CardTitle>
            </CardHeader>
            <CardContent>
              {membersError ? (
                <EndpointErrorBanner state="missing" detail={membersError} />
              ) : (
                <CamporeeMembersTab
                  camporeeId={camporeeId}
                  initialMembers={members}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
