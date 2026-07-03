import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";
import { apiRequest } from "@/lib/api/client";
import { getCamporeeById } from "@/lib/api/camporees";
import {
  listLocalCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import { updateCamporeeAgendaEventAction } from "@/lib/camporee-events/actions";
import { getCamporeeEventRubrics } from "@/lib/api/camporee-scoring";
import {
  EventFormPage,
  type UserOption,
} from "@/components/camporee-events/event-form-page";
import type { BackendCamporeeEvent } from "@/lib/api/camporee-events";
import type { CamporeeEventRubric } from "@/lib/api/camporee-scoring";
import type { Camporee } from "@/lib/api/camporees";

type Params = Promise<{ id: string; eventId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Editar evento" };
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
    if (nested.local_camporee_id != null || nested.name != null) return nested;
  }
  if (root.local_camporee_id != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord): Camporee {
  return {
    camporee_id: toPositiveNumber(raw.local_camporee_id ?? raw.camporee_id ?? raw.id) ?? undefined,
    name: String(raw.name ?? ""),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined,
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

function extractEvent(payload: unknown): BackendCamporeeEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as AnyRecord;
  const candidate =
    root.data && typeof root.data === "object" ? (root.data as AnyRecord) : root;
  if (typeof candidate.camporee_event_id === "number") {
    return candidate as unknown as BackendCamporeeEvent;
  }
  return null;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function LocalCamporeeEventEditPage({ params }: { params: Params }) {
  const user = await requireAdminUser();

  const canEdit = hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
  if (!canEdit) redirect("/dashboard/camporees");

  const { id: idParam, eventId: eventIdParam } = await params;
  const camporeeId = toPositiveNumber(idParam);
  const eventId = toPositiveNumber(eventIdParam);
  if (!camporeeId) notFound();
  if (!eventId) notFound();

  let venues: CamporeeVenue[] = [];
  let rubrics: CamporeeEventRubric[] = [];

  // Fetch all in parallel — best effort for venues
  const [camporeeRes, eventRes, venuesRes] = await Promise.allSettled([
    getCamporeeById(camporeeId),
    apiRequest<unknown>(`/camporee-events/${eventId}`),
    listLocalCamporeeVenues(camporeeId),
  ]);

  if (camporeeRes.status !== "fulfilled") notFound();
  const raw = extractCamporee(camporeeRes.value);
  if (!raw) notFound();
  const camporee = normalizeCamporee(raw);

  if (eventRes.status !== "fulfilled") notFound();
  const extractedEvent = extractEvent(eventRes.value);
  if (!extractedEvent) notFound();
  const event = extractedEvent;

  if (venuesRes.status === "fulfilled") {
    venues = extractList<CamporeeVenue>(venuesRes.value);
  }

  try {
    const rubricsPayload = await getCamporeeEventRubrics(eventId);
    rubrics = extractList<CamporeeEventRubric>(rubricsPayload);
  } catch {
    rubrics = [];
  }

  const users: UserOption[] = [];

  async function boundAction(
    prev: import("@/lib/camporee-events/actions").CamporeeEventActionState,
    formData: FormData,
  ) {
    "use server";
    formData.set("id", String(eventId));
    formData.set("camporee_id", String(camporeeId));
    return updateCamporeeAgendaEventAction(prev, formData);
  }

  return (
    <EventFormPage
      mode="edit"
      camporeeId={camporeeId}
      camporee={camporee}
      venues={venues}
      users={users}
      event={event}
      rubrics={rubrics}
      action={boundAction}
    />
  );
}
