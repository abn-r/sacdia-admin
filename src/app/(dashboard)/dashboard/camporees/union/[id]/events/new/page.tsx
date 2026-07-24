import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREES_CREATE,
} from "@/lib/auth/permissions";
import {
  getUnionCamporeeById,
  getUnionEnrolledClubs,
  type CamporeeClub,
} from "@/lib/api/camporees";
import {
  listCamporeeEventTypes,
  type CamporeeEventType,
} from "@/lib/api/camporee-events";
import {
  listCamporeeStaff,
  type CamporeeStaffMember,
} from "@/lib/api/camporee-staff";
import {
  listUnionCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import { createUnionCamporeeAgendaEventAction } from "@/lib/camporee-events/actions";
import {
  EventFormPage,
  type UserOption,
} from "@/components/camporee-events/event-form-page";
import type { Camporee } from "@/lib/api/camporees";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Nuevo evento" };
}

// ─── Normalizers ───────────────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCamporee(payload: unknown): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested.union_camporee_id != null || nested.name != null) return nested;
  }
  if (root.union_camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.union_camporee_id ?? raw.camporee_id ?? raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    club_registration_closed_at:
      typeof raw.club_registration_closed_at === "string"
        ? raw.club_registration_closed_at
        : null,
    club_registration_closed_by:
      typeof raw.club_registration_closed_by === "string"
        ? raw.club_registration_closed_by
        : null,
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    active: raw.active !== false,
  };
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const root = payload as AnyRecord;
    if (Array.isArray(root.data)) return root.data as T[];
  }
  return [];
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function UnionCamporeeEventNewPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canCreate = hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE]);
  if (!canCreate) redirect("/dashboard/camporees/union");

  const { id: idParam } = await params;
  const camporeeId = toPositiveNumber(idParam);
  if (!camporeeId) notFound();

  let camporee: Camporee;
  let venues: CamporeeVenue[] = [];
  let eventTypes: CamporeeEventType[] = [];
  let camporeeClubs: CamporeeClub[] = [];
  let staffRoster: CamporeeStaffMember[] = [];

  try {
    const payload = await getUnionCamporeeById(camporeeId);
    const raw = extractCamporee(payload);
    if (!raw) notFound();
    camporee = normalizeCamporee(raw);
  } catch {
    notFound();
  }

  try {
    const venuesPayload = await listUnionCamporeeVenues(camporeeId);
    venues = extractList<CamporeeVenue>(venuesPayload);
  } catch {
    // Degrade gracefully — venues not required to create an event
  }

  try {
    const typesPayload = await listCamporeeEventTypes();
    eventTypes = extractList<CamporeeEventType>(typesPayload);
  } catch {
    eventTypes = [];
  }

  try {
    const clubsPayload = await getUnionEnrolledClubs(camporeeId);
    camporeeClubs = extractList<CamporeeClub>(clubsPayload);
  } catch {
    camporeeClubs = [];
  }

  try {
    const staffPayload = await listCamporeeStaff("union", camporeeId);
    staffRoster = extractList<CamporeeStaffMember>(staffPayload);
  } catch {
    staffRoster = [];
  }

  // Users list: not fetching from backend in this version — empty list allowed
  // (the form shows "Sin responsable" as default). A future PR can wire
  // a member-list endpoint here.
  const users: UserOption[] = [];

  async function boundAction(
    prev: import("@/lib/camporee-events/actions").CamporeeEventActionState,
    formData: FormData,
  ) {
    "use server";
    formData.set("camporee_id", String(camporeeId));
    formData.set("is_union", "true");
    return createUnionCamporeeAgendaEventAction(prev, formData);
  }

  return (
    <EventFormPage
      mode="create"
      camporeeId={camporeeId}
      camporee={camporee}
      venues={venues}
      users={users}
      eventTypes={eventTypes}
      camporeeClubs={camporeeClubs}
      staffRoster={staffRoster}
      scoringSetupEnabled={Boolean(camporee.club_registration_closed_at)}
      isUnionCamporee
      action={boundAction}
    />
  );
}
