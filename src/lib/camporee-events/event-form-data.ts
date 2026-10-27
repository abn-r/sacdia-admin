import { notFound, redirect } from "next/navigation";
import { canCapability } from "@/lib/auth/screen-catalog";
import type { AuthUser } from "@/lib/auth/types";
import { apiRequest } from "@/lib/api/client";
import {
  getCamporeeById,
  getEnrolledClubs,
  getUnionCamporeeById,
  getUnionEnrolledClubs,
  type Camporee,
  type CamporeeClub,
} from "@/lib/api/camporees";
import { normalizeCamporeeClubs } from "@/lib/camporees/club-display";
import {
  listCamporeeEventTypes,
  type BackendCamporeeEvent,
  type CamporeeEventType,
} from "@/lib/api/camporee-events";
import {
  listLocalCamporeeVenues,
  listUnionCamporeeVenues,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";
import {
  getCamporeeEventRubrics,
  type CamporeeEventRubric,
} from "@/lib/api/camporee-scoring";
import { submitBoundCamporeeAgendaEventAction } from "@/lib/camporee-events/actions";
import type { EventFormPageProps, UserOption } from "@/components/camporee-events/event-form-page";

export type CamporeeEventScope = "local" | "union";

/**
 * Discriminated so callers keep the original gating: no capability →
 * redirect to the camporee list, bad ids / missing records → 404.
 */
export type EventFormDataResult =
  | { status: "forbidden"; redirectTo: string }
  | { status: "not-found" }
  | { status: "ok"; props: EventFormPageProps };

/** Applies the gate (redirect / 404) and returns the form props. */
export function resolveEventFormData(result: EventFormDataResult): EventFormPageProps {
  if (result.status === "forbidden") redirect(result.redirectTo);
  if (result.status === "not-found") notFound();
  return result.props;
}

type AnyRecord = Record<string, unknown>;

function toPositiveNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractCamporee(payload: unknown, scope: CamporeeEventScope): AnyRecord | null {
  if (!payload || typeof payload !== "object") return null;
  const idKey = scope === "union" ? "union_camporee_id" : "local_camporee_id";
  const root = payload as AnyRecord;
  if (root.data && typeof root.data === "object") {
    const nested = root.data as AnyRecord;
    if (nested[idKey] != null || nested.name != null) return nested;
  }
  if (root[idKey] != null || root.name != null) return root;
  return null;
}

function normalizeCamporee(raw: AnyRecord, scope: CamporeeEventScope): Camporee {
  const base: Camporee = {
    camporee_id:
      toPositiveNumber(
        (scope === "union" ? raw.union_camporee_id : raw.local_camporee_id) ??
          raw.camporee_id ??
          raw.id,
      ) ?? undefined,
    name: String(raw.name ?? ""),
    start_date: String(raw.start_date ?? ""),
    end_date: String(raw.end_date ?? ""),
    includes_adventurers: raw.includes_adventurers === true,
    includes_pathfinders: raw.includes_pathfinders !== false,
    includes_master_guides: raw.includes_master_guides === true,
    active: raw.active !== false,
  };
  if (scope === "local") {
    return { ...base, local_field_id: toPositiveNumber(raw.local_field_id) ?? undefined };
  }
  return base;
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

const SCREEN_ID: Record<CamporeeEventScope, string> = {
  local: "campamentos-list-local",
  union: "campamentos-list-union",
};

const FORBIDDEN_REDIRECT: Record<CamporeeEventScope, string> = {
  local: "/dashboard/campamentos",
  union: "/dashboard/campamentos/union",
};

/** List the camporee agenda returns to (cancel / full-page fallback). */
export function camporeeEventsListHref(scope: CamporeeEventScope, camporeeId: number | string) {
  return scope === "union"
    ? `/dashboard/campamentos/union/${camporeeId}?tab=events`
    : `/dashboard/campamentos/${camporeeId}?tab=events`;
}

async function loadEventTypes(): Promise<CamporeeEventType[]> {
  try {
    return extractList<CamporeeEventType>(await listCamporeeEventTypes());
  } catch {
    return [];
  }
}

async function loadCamporeeClubs(
  scope: CamporeeEventScope,
  camporeeId: number,
): Promise<CamporeeClub[]> {
  try {
    const payload =
      scope === "union"
        ? await getUnionEnrolledClubs(camporeeId)
        : await getEnrolledClubs(camporeeId);
    return normalizeCamporeeClubs(payload);
  } catch {
    return [];
  }
}

/**
 * Props for `EventFormPage` (create), shared by the full page and the
 * intercepted modal.
 */
export async function loadCreateCamporeeEventFormData(
  user: AuthUser,
  scope: CamporeeEventScope,
  idParam: string,
): Promise<EventFormDataResult> {
  if (!canCapability(user, SCREEN_ID[scope], "events.create")) {
    return { status: "forbidden", redirectTo: FORBIDDEN_REDIRECT[scope] };
  }

  const camporeeId = toPositiveNumber(idParam);
  if (!camporeeId) return { status: "not-found" };

  let camporee: Camporee;
  try {
    const payload =
      scope === "union"
        ? await getUnionCamporeeById(camporeeId)
        : await getCamporeeById(camporeeId);
    const raw = extractCamporee(payload, scope);
    if (!raw) return { status: "not-found" };
    camporee = normalizeCamporee(raw, scope);
  } catch {
    return { status: "not-found" };
  }

  let venues: CamporeeVenue[] = [];
  try {
    const venuesPayload =
      scope === "union"
        ? await listUnionCamporeeVenues(camporeeId)
        : await listLocalCamporeeVenues(camporeeId);
    venues = extractList<CamporeeVenue>(venuesPayload);
  } catch {
    // Degrade gracefully — venues not required to create an event
  }

  const eventTypes = await loadEventTypes();
  const camporeeClubs = await loadCamporeeClubs(scope, camporeeId);

  // Users list: not fetching from backend in this version — empty list allowed
  // (the form shows "Sin responsable" as default). A future PR can wire
  // a member-list endpoint here.
  const users: UserOption[] = [];

  return {
    status: "ok",
    props: {
      mode: "create",
      camporeeId,
      camporee,
      venues,
      users,
      eventTypes,
      camporeeClubs,
      isUnionCamporee: scope === "union",
      action: submitBoundCamporeeAgendaEventAction.bind(null, {
        camporeeId,
        isUnion: scope === "union",
      }),
    },
  };
}

/**
 * Props for `EventFormPage` (edit), shared by the full page and the
 * intercepted modal.
 */
export async function loadEditCamporeeEventFormData(
  user: AuthUser,
  scope: CamporeeEventScope,
  idParam: string,
  eventIdParam: string,
): Promise<EventFormDataResult> {
  if (!canCapability(user, SCREEN_ID[scope], "events.update")) {
    return { status: "forbidden", redirectTo: FORBIDDEN_REDIRECT[scope] };
  }

  const camporeeId = toPositiveNumber(idParam);
  const eventId = toPositiveNumber(eventIdParam);
  if (!camporeeId || !eventId) return { status: "not-found" };

  // Fetch all in parallel — best effort for venues
  const [camporeeRes, eventRes, venuesRes] = await Promise.allSettled([
    scope === "union" ? getUnionCamporeeById(camporeeId) : getCamporeeById(camporeeId),
    apiRequest<unknown>(`/camporee-events/${eventId}`),
    scope === "union"
      ? listUnionCamporeeVenues(camporeeId)
      : listLocalCamporeeVenues(camporeeId),
  ]);

  if (camporeeRes.status !== "fulfilled") return { status: "not-found" };
  const raw = extractCamporee(camporeeRes.value, scope);
  if (!raw) return { status: "not-found" };
  const camporee = normalizeCamporee(raw, scope);

  if (eventRes.status !== "fulfilled") return { status: "not-found" };
  const event = extractEvent(eventRes.value);
  if (!event) return { status: "not-found" };

  const venues =
    venuesRes.status === "fulfilled" ? extractList<CamporeeVenue>(venuesRes.value) : [];

  const eventTypes = await loadEventTypes();
  const camporeeClubs = await loadCamporeeClubs(scope, camporeeId);

  let rubrics: CamporeeEventRubric[] = [];
  try {
    rubrics = extractList<CamporeeEventRubric>(await getCamporeeEventRubrics(eventId));
  } catch {
    rubrics = [];
  }

  const users: UserOption[] = [];

  return {
    status: "ok",
    props: {
      mode: "edit",
      camporeeId,
      camporee,
      venues,
      users,
      eventTypes,
      camporeeClubs,
      isUnionCamporee: scope === "union",
      event,
      rubrics,
      action: submitBoundCamporeeAgendaEventAction.bind(null, {
        camporeeId,
        eventId,
        isUnion: scope === "union",
      }),
    },
  };
}
