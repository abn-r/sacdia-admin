import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { EndpointErrorBanner } from "@/components/shared/endpoint-error-banner";
import { ActivitiesView } from "@/components/activities/activities-view";
import { ApiError } from "@/lib/api/client";
import { listActivities } from "@/lib/api/activities";
import { requireAdminUser } from "@/lib/auth/session";
import { apiRequest } from "@/lib/api/client";
import type { Activity } from "@/lib/api/activities";

// ─── Types ─────────────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

type Club = {
  club_id: number;
  name: string;
};

type Section = {
  club_section_id: number;
  name: string;
  club_type_id: number;
};

// ─── Normalizers ───────────────────────────────────────────────────────────────

function extractArray(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as AnyRecord[];
  }
  return [];
}

function normalizeClub(raw: AnyRecord): Club {
  return {
    club_id: Number(raw.club_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Club ${raw.club_id ?? "?"}`),
  };
}

function normalizeSection(raw: AnyRecord): Section {
  return {
    club_section_id: Number(raw.club_section_id ?? raw.id ?? 0),
    name: String(raw.name ?? `Sección ${raw.club_section_id ?? "?"}`),
    club_type_id: Number(raw.club_type_id ?? 0),
  };
}

function normalizeActivity(raw: AnyRecord): Activity {
  return {
    activity_id: Number(raw.activity_id ?? raw.id ?? 0),
    name: String(raw.name ?? ""),
    description: typeof raw.description === "string" ? raw.description : null,
    club_id: Number(raw.club_id ?? 0),
    club_type_id: Number(raw.club_type_id ?? 0),
    club_section_id: Number(raw.club_section_id ?? 0),
    lat: Number(raw.lat ?? 0),
    long: Number(raw.long ?? 0),
    activity_time: typeof raw.activity_time === "string" ? raw.activity_time : null,
    activity_place: String(raw.activity_place ?? ""),
    image: typeof raw.image === "string" ? raw.image : null,
    platform: typeof raw.platform === "number" ? raw.platform : null,
    activity_type_id: Number(raw.activity_type_id ?? 0),
    activity_type:
      raw.activity_type && typeof raw.activity_type === "object"
        ? (raw.activity_type as Activity["activity_type"])
        : null,
    link_meet: typeof raw.link_meet === "string" ? raw.link_meet : null,
    additional_data: typeof raw.additional_data === "string" ? raw.additional_data : null,
    classes: Array.isArray(raw.classes) ? (raw.classes as number[]) : [],
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : null,
  };
}

function extractActivities(payload: unknown): AnyRecord[] {
  if (Array.isArray(payload)) return payload as AnyRecord[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) {
      const data = root.data as AnyRecord[];
      // Some paginated responses: { data: { data: [], total, page } }
      if (
        data.length > 0 &&
        typeof data[0] === "object" &&
        data[0] !== null &&
        "data" in (data[0] as object)
      ) {
        const inner = (data[0] as AnyRecord).data;
        if (Array.isArray(inner)) return inner as AnyRecord[];
      }
      return data;
    }
    // Paginated: { data: { data: [], total } }
    const nested = root.data as AnyRecord | null;
    if (nested && typeof nested === "object" && Array.isArray(nested.data)) {
      return nested.data as AnyRecord[];
    }
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function ActivitiesPage() {
  await requireAdminUser();

  let clubs: Club[] = [];
  let sectionsByClub: Record<number, Section[]> = {};
  let initialActivities: Activity[] = [];
  let loadError: string | null = null;

  // 1. Load clubs list
  try {
    const clubsPayload = await apiRequest<unknown>("/clubs");
    const rawClubs = extractArray(clubsPayload);
    clubs = rawClubs.map(normalizeClub).filter((c) => c.club_id > 0);
  } catch (err) {
    loadError =
      err instanceof ApiError
        ? err.message
        : "No se pudo cargar la lista de clubes.";
  }

  // 2. If clubs loaded, fetch sections for each club and activities for the first club
  if (clubs.length > 0 && !loadError) {
    const firstClub = clubs[0];

    // Fetch sections for all clubs (best effort)
    const sectionPromises = clubs.map(async (club) => {
      try {
        const payload = await apiRequest<unknown>(`/clubs/${club.club_id}/sections`);
        const rawSections = extractArray(payload);
        return { clubId: club.club_id, sections: rawSections.map(normalizeSection) };
      } catch {
        return { clubId: club.club_id, sections: [] };
      }
    });

    const sectionsResults = await Promise.all(sectionPromises);
    sectionsByClub = Object.fromEntries(
      sectionsResults.map(({ clubId, sections }) => [clubId, sections]),
    );

    // Fetch initial activities for the first club
    try {
      const activitiesPayload = await listActivities(firstClub.club_id, {
        page: 1,
        limit: 50,
      });
      const rawActivities = extractActivities(activitiesPayload);
      initialActivities = rawActivities.map(normalizeActivity);
    } catch (err) {
      // Non-fatal — the client component can re-fetch
      console.warn("Failed to load initial activities:", err);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actividades"
        description="Gestión de actividades por club."
      />

      {loadError && (
        <EndpointErrorBanner state="missing" detail={loadError} />
      )}

      {!loadError && clubs.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="No hay clubes registrados"
          description="Registra al menos un club para gestionar sus actividades."
        />
      )}

      {!loadError && clubs.length > 0 && (
        <ActivitiesView
          clubs={clubs}
          sectionsByClub={sectionsByClub}
          initialActivities={initialActivities}
          initialClubId={clubs[0]?.club_id ?? null}
        />
      )}
    </div>
  );
}
