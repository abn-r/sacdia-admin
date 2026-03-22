import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Clock, Monitor, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { AttendancePanel } from "@/components/activities/attendance-panel";
import { ActivityDetailActions } from "@/components/activities/activity-detail-actions";
import { ApiError } from "@/lib/api/client";
import { getActivity, getAttendance, PLATFORM_LABELS, ACTIVITY_TYPE_LABELS } from "@/lib/api/activities";
import { requireAdminUser } from "@/lib/auth/session";
import type { Activity, AttendanceRecord } from "@/lib/api/activities";

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

function extractActivity(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.activity_id != null || nested.name != null) return nested;
    if (nested.data && typeof nested.data === "object") return nested.data as AnyRecord;
  }
  if (root.activity_id != null || root.name != null) return root;
  return null;
}

function normalizeActivity(raw: AnyRecord): Activity {
  return {
    activity_id: Number(raw.activity_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: toText(raw.description),
    club_id: Number(raw.club_id ?? 0),
    club_type_id: Number(raw.club_type_id ?? 0),
    club_section_id: Number(raw.club_section_id ?? 0),
    lat: Number(raw.lat ?? 0),
    long: Number(raw.long ?? 0),
    activity_time: toText(raw.activity_time),
    activity_place: String(raw.activity_place ?? ""),
    image: toText(raw.image),
    platform: typeof raw.platform === "number" ? raw.platform : null,
    activity_type_id: Number(raw.activity_type_id ?? 0),
    activity_type:
      raw.activity_type && typeof raw.activity_type === "object"
        ? (raw.activity_type as Activity["activity_type"])
        : null,
    link_meet: toText(raw.link_meet),
    additional_data: toText(raw.additional_data),
    classes: Array.isArray(raw.classes) ? (raw.classes as number[]) : [],
    active: raw.active !== false,
    created_at: toText(raw.created_at),
    updated_at: toText(raw.updated_at),
  };
}

function extractAttendance(payload: unknown): AttendanceRecord[] {
  if (Array.isArray(payload)) return payload as AttendanceRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AttendanceRecord[];
    const nested = root.data as AnyRecord | null;
    if (nested && typeof nested === "object" && Array.isArray(nested.data)) {
      return nested.data as AttendanceRecord[];
    }
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
      <span className="text-sm">{value ?? <span className="text-muted-foreground">—</span>}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ActivityDetailPage({ params }: { params: Params }) {
  await requireAdminUser();

  const { id } = await params;
  const activityId = toPositiveNumber(id);
  if (!activityId) notFound();

  let activity: Activity;
  let attendance: AttendanceRecord[] = [];
  let attendanceError: string | null = null;

  // Fetch activity detail
  try {
    const payload = await getActivity(activityId);
    const raw = extractActivity(payload);
    if (!raw) notFound();
    activity = normalizeActivity(raw);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  // Fetch attendance — best effort
  try {
    const attendancePayload = await getAttendance(activityId);
    attendance = extractAttendance(attendancePayload);
  } catch (err) {
    attendanceError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la lista de asistencia.";
  }

  const typeLabel =
    activity.activity_type?.name ??
    ACTIVITY_TYPE_LABELS[activity.activity_type_id] ??
    `Tipo ${activity.activity_type_id}`;

  const platformLabel =
    activity.platform != null
      ? (PLATFORM_LABELS[activity.platform] ?? "—")
      : "Presencial";

  const mapsUrl =
    activity.lat !== 0 && activity.long !== 0
      ? `https://maps.google.com/?q=${activity.lat},${activity.long}`
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title={activity.name} description="Detalle de actividad">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/activities">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
        <ActivityDetailActions activity={activity} />
      </PageHeader>

      {/* Summary card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Calendar className="size-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{activity.name}</h2>
            {activity.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activity.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{typeLabel}</Badge>
            <Badge variant={activity.active ? "default" : "outline"}>
              {activity.active ? "Activa" : "Inactiva"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="ID" value={activity.activity_id} />
          <InfoRow
            label="Lugar"
            value={activity.activity_place || "—"}
            icon={MapPin}
          />
          <InfoRow
            label="Hora"
            value={activity.activity_time ?? "—"}
            icon={Clock}
          />
          <InfoRow
            label="Modalidad"
            value={platformLabel}
            icon={Monitor}
          />
          {activity.link_meet && (
            <InfoRow
              label="Enlace de reunión"
              value={
                <a
                  href={activity.link_meet}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {activity.link_meet}
                </a>
              }
              icon={Link2}
            />
          )}
          {mapsUrl && (
            <InfoRow
              label="Coordenadas"
              value={
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {activity.lat}, {activity.long}
                </a>
              }
              icon={MapPin}
            />
          )}
        </CardContent>
      </Card>

      {/* Image preview */}
      {activity.image && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagen</CardTitle>
          </CardHeader>
          <CardContent>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activity.image}
              alt={activity.name}
              className="max-h-64 rounded-lg object-cover"
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs: Attendance */}
      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">
            Asistencia
            {attendance.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {attendance.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lista de asistentes</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceError ? (
                <EndpointErrorBanner state="missing" detail={attendanceError} />
              ) : (
                <AttendancePanel records={attendance} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
