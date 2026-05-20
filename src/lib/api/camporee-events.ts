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

export type CamporeeEvent = {
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
  event_type?: Record<string, unknown>;
};

export type CreateCamporeeEventPayload = {
  event_type_id: number;
  title: string;
  description?: string | null;
  requirements?: string | null;
  development?: string | null;
  prerequisites?: string | null;
  materials?: string | null;
  auxiliaries?: string | null;
  max_points: number;
  min_points?: number;
  penalties?: PenaltyRule[];
  participants_mode: ParticipantsMode;
  participants_count?: number | null;
  participants_by_class?: ParticipantsByClass[] | null;
  duration_seconds?: number | null;
  display_order?: number;
  active?: boolean;
};

export type UpdateCamporeeEventPayload = Partial<CreateCamporeeEventPayload>;

export type ReorderCamporeeEventPayload = {
  display_order: number;
};

// ─── Template endpoints ────────────────────────────────────────────────────────

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

// ─── Instance endpoints — local camporees ─────────────────────────────────────

export async function listLocalCamporeeEvents(
  camporeeId: number,
  params?: Record<string, string | number | boolean>,
) {
  return apiRequest<unknown>(`/local-camporees/${camporeeId}/events`, { params });
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
  params?: Record<string, string | number | boolean>,
) {
  return apiRequest<unknown>(`/union-camporees/${camporeeId}/events`, { params });
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
