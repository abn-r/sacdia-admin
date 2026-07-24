/**
 * Mapper: BackendCamporeeEvent[] → CamporeeEventsData
 *
 * This is the ONLY place that translates the backend API response shape into
 * the timeline domain types. Components MUST NOT perform inline transformation.
 *
 * Design decisions locked in sdd/camporee-agenda-events/tasks:
 * - Empty sections[] at read time → derive all sections of the camporee
 * - display_category matches EventCategoryId enum 1:1
 * - status maps directly to EventStatus enum
 * - leaderName: backend leader JOIN → leader_name_override → "—"
 * - templateId: int from backend, stringify in mapper
 * - capacity 0 = "open attendance" (literal)
 */

import type { Camporee } from "@/lib/api/camporees";
import type {
  BackendCamporeeEvent,
  CamporeeEventStaffAssignment,
  CamporeeEventTemplate,
} from "@/lib/api/camporee-events";
import type { CamporeeVenue as BackendCamporeeVenue } from "@/lib/api/camporee-venues";
import type {
  CamporeeEventsData,
  CamporeeEvent,
  CamporeeDay,
  EventTemplate,
  EventCategoryId,
  Section,
  Venue,
} from "./types";
import { durMin } from "./helpers";

// ─── Spanish day/month constants ──────────────────────────────────────────────

const DAY_NAMES_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

// ─── Section mapping ──────────────────────────────────────────────────────────

const BACKEND_SECTION_TO_UI: Record<string, Section> = {
  adventurers: "Aventureros",
  pathfinders: "Conquistadores",
  master_guides: "Guías Mayores",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive all camporee sections from the parent camporee's includes_* flags.
 * Used when an event has an empty sections array (= "all sections of camporee").
 */
function deriveAllSectionsFromCamporee(camporee: Camporee): Section[] {
  const out: Section[] = [];
  if (camporee.includes_adventurers) out.push("Aventureros");
  if (camporee.includes_pathfinders !== false) out.push("Conquistadores");
  if (camporee.includes_master_guides) out.push("Guías Mayores");
  // Fallback: if none of the flags are set, assume all three sections
  if (out.length === 0) return ["Aventureros", "Conquistadores", "Guías Mayores"];
  return out;
}

/**
 * Map backend section strings to UI display labels.
 * Unknown values are passed through as-is (future-proof).
 */
function mapSections(sections: string[]): Section[] {
  return sections.map((s) => (BACKEND_SECTION_TO_UI[s] ?? s) as Section);
}

/**
 * Resolve the leader's display name from the backend event row.
 * Priority: joined user name > leader_name_override > fallback "—".
 */
function resolveLeaderName(event: BackendCamporeeEvent): string {
  if (event.leader?.name) {
    const surname = event.leader.surname ?? "";
    return surname ? `${event.leader.name} ${surname}`.trim() : event.leader.name;
  }
  if (event.leader_name_override) return event.leader_name_override;
  return "—";
}

function resolveStaffName(assignment: CamporeeEventStaffAssignment): string | null {
  const user = assignment.staff_member?.user;
  if (!user) return null;
  const joined = [user.name, user.paternal_last_name, user.maternal_last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ");
  return user.full_name || joined || null;
}

function staffRoleLabel(assignment: CamporeeEventStaffAssignment): string {
  if (assignment.title_override) return assignment.title_override;
  if (assignment.staff_member?.role_label) return assignment.staff_member.role_label;
  if (assignment.assignment_role === "responsible") return "Responsable";
  if (assignment.assignment_role === "assistant") return "Ayudante";
  if (assignment.assignment_role === "evaluator") return "Evaluador";
  return "Apoyo";
}

function resolveStaffSummary(event: BackendCamporeeEvent) {
  const assignments = (event.staff_assignments ?? [])
    .filter((assignment) => assignment.active !== false)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const responsible = assignments.find(
    (assignment) => assignment.assignment_role === "responsible",
  );
  const helpers = assignments.filter(
    (assignment) => assignment.assignment_role !== "responsible",
  );

  return {
    staffResponsibleName: responsible ? resolveStaffName(responsible) ?? "Personal asignado" : undefined,
    staffResponsibleRole: responsible ? staffRoleLabel(responsible) : undefined,
    staffHelpers: helpers
      .map((assignment) => resolveStaffName(assignment))
      .filter((value): value is string => Boolean(value)),
  };
}

/**
 * Format a Date object to a short "15 jul" string (Spanish).
 */
function formatDayShort(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Derive the array of CamporeeDay objects from a start/end date range.
 * start and end are ISO date strings (YYYY-MM-DD or full ISO).
 */
export function deriveDaysFromRange(startDate: string, endDate: string): CamporeeDay[] {
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const days: CamporeeDay[] = [];

  let n = 1;
  const cursor = new Date(
    Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), startD.getUTCDate()),
  );
  const limit = new Date(
    Date.UTC(endD.getUTCFullYear(), endD.getUTCMonth(), endD.getUTCDate()),
  );

  while (cursor <= limit) {
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cursor.getUTCDate()).padStart(2, "0");

    days.push({
      id: `d${n}`,
      numero: n,
      fecha: `${y}-${m}-${d}`,
      diaSemana: DAY_NAMES_ES[cursor.getUTCDay()],
      fechaFmt: formatDayShort(cursor),
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
    n++;
  }

  // Guard: always produce at least one day even if dates are invalid/equal
  if (days.length === 0) {
    days.push({
      id: "d1",
      numero: 1,
      fecha: startDate.slice(0, 10),
      diaSemana: "—",
      fechaFmt: startDate.slice(0, 10),
    });
  }

  return days;
}

/**
 * Map a backend venue row to the Venue UI shape.
 */
export function mapVenue(v: BackendCamporeeVenue): Venue {
  return {
    id: String(v.camporee_venue_id),
    name: v.name,
    capacity: v.capacity ?? 0,
  };
}

/**
 * Map a backend event template to the EventTemplate UI shape.
 */
export function mapTemplate(t: CamporeeEventTemplate): EventTemplate {
  const scopeId = t.union_id
    ? String(t.union_id)
    : t.local_field_id
      ? String(t.local_field_id)
      : "";

  return {
    id: String(t.event_template_id),
    title: t.title,
    description: t.description ?? "",
    category: "logistico" as EventCategoryId, // templates don't carry display_category per task decision 3
    scope: t.scope,
    scopeId,
    durationMin: Math.round((t.duration_seconds ?? 3600) / 60),
    sections: [], // templates don't carry sections per task decision 3
    defaultPoints: t.max_points,
    defaultCapacity: t.participants_count ?? undefined,
    createdBy: "",
    uses: 0,
  };
}

/**
 * Compute the timeline summary statistics from raw backend events.
 */
export function computeSummary(events: BackendCamporeeEvent[]): CamporeeEventsData["summary"] {
  const totalMin = events.reduce((s, e) => {
    const start = e.starts_at ?? "00:00";
    const end = e.ends_at ?? "00:00";
    return s + durMin(start, end);
  }, 0);

  const fromCatalog = events.filter((e) => e.event_template_id !== null).length;

  return {
    total: events.length,
    published: events.filter((e) => e.status === "publicado").length,
    cancelled: events.filter((e) => e.status === "cancelado").length,
    venuesUsed: new Set(events.map((e) => e.venue_id).filter(Boolean)).size,
    hoursOfContent: Math.round(totalMin / 60),
    fromCatalog,
    new: events.length - fromCatalog,
  };
}

// ─── Main mapper ──────────────────────────────────────────────────────────────

export interface BackendToTimelineContext {
  camporee: Camporee;
  venues: BackendCamporeeVenue[];
  templates: CamporeeEventTemplate[];
}

/**
 * Transform a list of BackendCamporeeEvent rows into the full CamporeeEventsData
 * shape consumed by EventsTimelineView and all timeline sub-components.
 *
 * This is the authoritative transformation — no inline mapping is permitted
 * in components or server actions.
 */
export function backendToTimeline(
  backendEvents: BackendCamporeeEvent[],
  ctx: BackendToTimelineContext,
): CamporeeEventsData {
  const { camporee, venues, templates } = ctx;

  const localCamporeeId = (camporee as Record<string, unknown>).local_camporee_id as number | undefined;
  const camporeeId = String(
    localCamporeeId ?? camporee.camporee_id ?? camporee.id ?? 0,
  );
  const isUnion = false; // local camporees only in this context; extend when union pages need it

  const allSections = deriveAllSectionsFromCamporee(camporee);

  const mappedEvents: CamporeeEvent[] = backendEvents.map((e) => ({
    id: String(e.camporee_event_id),
    camporeeId,
    templateId: e.event_template_id ? String(e.event_template_id) : null,
    title: e.title,
    description: e.description ?? "",
    category: e.display_category as EventCategoryId,
    dayNumber: e.day_number,
    startsAt: e.starts_at ?? "00:00",
    endsAt: e.ends_at ?? "00:00",
    venueId: e.venue_id ? String(e.venue_id) : "",
    leaderName: resolveLeaderName(e),
    leaderRole: e.leader_role ?? "",
    ...resolveStaffSummary(e),
    sections: e.sections.length > 0 ? mapSections(e.sections) : allSections,
    capacity: e.capacity ?? 0,
    registered: e.registered_count,
    points: e.max_points,
    status: e.status,
    fromCatalog: e.event_template_id !== null,
  }));

  // Derive days from camporee date range
  const days = deriveDaysFromRange(camporee.start_date, camporee.end_date);

  return {
    camporeeId,
    camporeeType: isUnion ? "union" : "local",
    // The Camporee type does not carry the union name. Callers that need it
    // should spread unionName over the returned value, e.g.:
    //   { ...backendToTimeline(events, ctx), unionName: "Unión Norte" }
    unionName: "",
    localFieldName: camporee.local_field?.name ?? undefined,
    days,
    venues: venues.map(mapVenue),
    events: mappedEvents,
    templates: templates.map(mapTemplate),
    summary: computeSummary(backendEvents),
  };
}
