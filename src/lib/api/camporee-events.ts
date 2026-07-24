/**
 * Camporee Events API client
 *
 * Covers three domains:
 *   - camporee_event_templates (reusable blueprints, scoped to union or local_field)
 *   - camporee_events (instances assigned to a specific local or union camporee)
 *
 * All endpoints under /api/v1 (prefix handled by apiRequest base URL).
 */

import { apiRequest } from "@/lib/api/client";
import type {
  CamporeeEventRubric,
  CamporeeEventTemplateRubric,
  CamporeeTemplateRubricInput,
} from "@/lib/api/camporee-scoring";

// ─── Shared shapes ─────────────────────────────────────────────────────────────

export type ParticipantsMode = "count" | "by_class";
export type TemplateScope = "union" | "local_field";

export type PenaltyRule = {
  description: string;
  points_deducted: number;
  time_seconds?: number | null;
};

export type ParticipantsByClass = {
  class_id: number;
  count: number;
};

// ─── Event Template types ──────────────────────────────────────────────────────

export type CamporeeEventTemplate = {
  event_template_id: number;
  scope: TemplateScope;
  union_id?: number | null;
  local_field_id?: number | null;
  event_type_id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  development?: string | null;
  prerequisites?: string | null;
  materials?: string | null;
  auxiliaries?: string | null;
  max_points: number;
  scoring_enabled: boolean;
  rubrics?: CamporeeEventTemplateRubric[];
  min_points: number;
  penalties: PenaltyRule[];
  participants_mode: ParticipantsMode;
  participants_count?: number | null;
  participants_by_class?: ParticipantsByClass[] | null;
  duration_seconds?: number | null;
  active: boolean;
  created_at?: string;
  modified_at?: string;
  // Optional nested join from backend
  event_type?: Record<string, unknown>;
};

export type CreateCamporeeEventTemplatePayload = {
  scope: TemplateScope;
  union_id?: number | null;
  local_field_id?: number | null;
  event_type_id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  development?: string | null;
  prerequisites?: string | null;
  materials?: string | null;
  auxiliaries?: string | null;
  max_points: number;
  scoring_enabled?: boolean;
  rubrics?: CamporeeTemplateRubricInput[];
  min_points?: number;
  penalties?: PenaltyRule[];
  participants_mode: ParticipantsMode;
  participants_count?: number | null;
  participants_by_class?: ParticipantsByClass[] | null;
  duration_seconds?: number | null;
  active?: boolean;
};

export type UpdateCamporeeEventTemplatePayload = Partial<CreateCamporeeEventTemplatePayload>;

// ─── Camporee Event Instance types ─────────────────────────────────────────────

// Mirrors the backend `camporee_event_status` enum. Prisma maps the value
// `en_curso` to the canonical DB enum; the client MUST POST `en_curso`.
export type CamporeeEventStatus =
  | "programado"
  | "publicado"
  | "en_curso"
  | "realizado"
  | "cancelado";

export type CamporeeEventSection =
  | "adventurers"
  | "pathfinders"
  | "master_guides";

export type CamporeeEventDisplayCategory =
  | "espiritual"
  | "competencia"
  | "taller"
  | "ceremonial"
  | "social"
  | "logistico";

export type CamporeeEventType = {
  event_type_id: number;
  code: string;
  name: string;
  description?: string | null;
  display_order?: number | null;
  active?: boolean;
};

/** Leader info joined from the users table (present when leader_user_id is set) */
export type CamporeeEventLeader = {
  user_id: string;
  name: string;
  surname?: string | null;
};

/** Venue info joined from the camporee_venues table (present when venue_id is set) */
export type CamporeeEventVenueRef = {
  camporee_venue_id: number;
  name: string;
};

export type CamporeeEventScheduleBlockAssignment = {
  camporee_event_schedule_block_assignment_id?: string;
  schedule_block_id?: string;
  camporee_club_id?: number | null;
  club_section_id: number;
  club_section?: {
    club_section_id: number;
    name?: string | null;
    club_type_id?: number | null;
    main_club_id?: number | null;
    clubs?: { club_id: number; name?: string | null } | null;
    club_types?: { club_type_id: number; name?: string | null } | null;
  } | null;
};

export type CamporeeEventScheduleBlock = {
  camporee_event_schedule_block_id?: string;
  camporee_event_id?: number;
  title?: string | null;
  description?: string | null;
  day_number: number;
  starts_at?: string | null;
  ends_at?: string | null;
  venue_id?: number | null;
  venue?: CamporeeEventVenueRef | null;
  display_order?: number;
  capacity?: number | null;
  notes?: string | null;
  assignments?: CamporeeEventScheduleBlockAssignment[];
};

/**
 * Backend response shape for a camporee event instance.
 * Previously exported as `CamporeeEvent` — renamed to avoid collision with
 * the timeline domain type in `lib/camporee-timeline/types.ts`.
 */
export type BackendCamporeeEvent = {
  camporee_event_id: number;
  local_camporee_id?: number | null;
  union_camporee_id?: number | null;
  event_template_id?: number | null;
  event_type_id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  development?: string | null;
  prerequisites?: string | null;
  materials?: string | null;
  auxiliaries?: string | null;
  max_points: number;
  scoring_enabled: boolean;
  rubrics?: CamporeeEventRubric[];
  min_points: number;
  penalties: PenaltyRule[];
  participants_mode: ParticipantsMode;
  participants_count?: number | null;
  participants_by_class?: ParticipantsByClass[] | null;
  duration_seconds?: number | null;
  display_order: number;
  active: boolean;
  created_at?: string;
  modified_at?: string;
  event_type?: CamporeeEventType | null;
  // ── Agenda scheduling fields (added in camporee-agenda-events change) ──────
  day_number: number;
  starts_at?: string | null;
  ends_at?: string | null;
  venue_id?: number | null;
  leader_user_id?: string | null;
  leader_name_override?: string | null;
  leader_role?: string | null;
  sections: CamporeeEventSection[];
  display_category: CamporeeEventDisplayCategory;
  status: CamporeeEventStatus;
  capacity?: number | null;
  registered_count: number;
  agenda_visible?: boolean;
  schedule_blocks?: CamporeeEventScheduleBlock[];
  // ── Joined relations (present when backend includes them) ──────────────────
  leader?: CamporeeEventLeader | null;
  venue?: CamporeeEventVenueRef | null;
};

/**
 * @deprecated Use `BackendCamporeeEvent` instead.
 * Kept as a type alias for a smooth migration period.
 */
export type CamporeeEvent = BackendCamporeeEvent;

export type CreateCamporeeEventPayload = {
  /**
   * Optional — agenda events created from the admin timeline omit this and
   * the backend resolves the seeded `general` event type. Competition
   * events still pass an explicit id from the templates catalog.
   */
  event_type_id?: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  development?: string | null;
  prerequisites?: string | null;
  materials?: string | null;
  auxiliaries?: string | null;
  max_points: number;
  scoring_enabled?: boolean;
  min_points?: number;
  penalties?: PenaltyRule[];
  participants_mode: ParticipantsMode;
  participants_count?: number | null;
  participants_by_class?: ParticipantsByClass[] | null;
  duration_seconds?: number | null;
  display_order?: number;
  active?: boolean;
  // ── Agenda scheduling fields ──────────────────────────────────────────────
  day_number?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  venue_id?: number | null;
  leader_user_id?: string | null;
  leader_name_override?: string | null;
  leader_role?: string | null;
  sections?: CamporeeEventSection[];
  display_category?: CamporeeEventDisplayCategory;
  status?: CamporeeEventStatus;
  capacity?: number | null;
  registered_count?: number;
  schedule_blocks?: CamporeeEventScheduleBlock[];
};

export type UpdateCamporeeEventPayload = Partial<CreateCamporeeEventPayload>;

export type ReorderCamporeeEventPayload = {
  display_order: number;
};

// ─── Template endpoints ────────────────────────────────────────────────────────

export async function listCamporeeEventTypes() {
  return apiRequest<unknown>("/camporee-event-types");
}

export async function listCamporeeEventTemplates(
  params?: Record<string, string | number | boolean>,
) {
  return apiRequest<unknown>("/camporee-event-templates", { params });
}

export async function getCamporeeEventTemplate(id: number) {
  return apiRequest<unknown>(`/camporee-event-templates/${id}`);
}

export async function createCamporeeEventTemplate(
  payload: CreateCamporeeEventTemplatePayload,
) {
  return apiRequest("/camporee-event-templates", { method: "POST", body: payload });
}

export async function updateCamporeeEventTemplate(
  id: number,
  payload: UpdateCamporeeEventTemplatePayload,
) {
  return apiRequest(`/camporee-event-templates/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCamporeeEventTemplate(id: number) {
  return apiRequest(`/camporee-event-templates/${id}`, { method: "DELETE" });
}

// ─── List filter params ────────────────────────────────────────────────────────

export type ListCamporeeEventsParams = {
  day_number?: number;
  display_category?: CamporeeEventDisplayCategory;
  section?: CamporeeEventSection;
  status?: CamporeeEventStatus;
  venue_id?: number;
  leader_user_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

// ─── Instance endpoints — local camporees ─────────────────────────────────────

export async function listLocalCamporeeEvents(
  camporeeId: number,
  params?: ListCamporeeEventsParams & Record<string, string | number | boolean | undefined>,
) {
  return apiRequest<unknown>(`/local-camporees/${camporeeId}/events`, { params: params as Record<string, string | number | boolean | undefined> });
}

export async function createLocalCamporeeEvent(
  camporeeId: number,
  payload: CreateCamporeeEventPayload,
) {
  return apiRequest(`/local-camporees/${camporeeId}/events`, {
    method: "POST",
    body: payload,
  });
}

export async function cloneTemplateToLocalCamporee(
  camporeeId: number,
  templateId: number,
  overrides?: Partial<UpdateCamporeeEventPayload>,
) {
  return apiRequest(
    `/local-camporees/${camporeeId}/events/from-template/${templateId}`,
    { method: "POST", body: overrides ?? {} },
  );
}

// ─── Instance endpoints — union camporees ─────────────────────────────────────

export async function listUnionCamporeeEvents(
  camporeeId: number,
  params?: ListCamporeeEventsParams & Record<string, string | number | boolean | undefined>,
) {
  return apiRequest<unknown>(`/union-camporees/${camporeeId}/events`, { params: params as Record<string, string | number | boolean | undefined> });
}

export async function createUnionCamporeeEvent(
  camporeeId: number,
  payload: CreateCamporeeEventPayload,
) {
  return apiRequest(`/union-camporees/${camporeeId}/events`, {
    method: "POST",
    body: payload,
  });
}

export async function cloneTemplateToUnionCamporee(
  camporeeId: number,
  templateId: number,
  overrides?: Partial<UpdateCamporeeEventPayload>,
) {
  return apiRequest(
    `/union-camporees/${camporeeId}/events/from-template/${templateId}`,
    { method: "POST", body: overrides ?? {} },
  );
}

// ─── Instance endpoints — shared (camporee-events/:id) ────────────────────────

export async function updateCamporeeEvent(
  id: number,
  payload: UpdateCamporeeEventPayload,
) {
  return apiRequest(`/camporee-events/${id}`, { method: "PATCH", body: payload });
}

export async function replaceCamporeeEventScheduleBlocks(
  id: number,
  blocks: CamporeeEventScheduleBlock[],
) {
  return apiRequest(`/camporee-events/${id}/schedule-blocks`, {
    method: "PUT",
    body: { blocks },
  });
}

export async function deleteCamporeeEvent(id: number) {
  return apiRequest(`/camporee-events/${id}`, { method: "DELETE" });
}

export async function reorderCamporeeEvent(
  id: number,
  payload: ReorderCamporeeEventPayload,
) {
  return apiRequest(`/camporee-events/${id}/reorder`, {
    method: "PATCH",
    body: payload,
  });
}
