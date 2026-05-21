/**
 * Camporee Venues API client
 *
 * CRUD for camporee_venues — spaces/locations associated with a union or
 * local_field. Venues are used as the venue assignment for camporee events.
 */

import { apiRequest } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CamporeeVenueScope = "union" | "local_field";

export type CamporeeVenue = {
  camporee_venue_id: number;
  scope: CamporeeVenueScope;
  union_id?: number | null;
  local_field_id?: number | null;
  name: string;
  description?: string | null;
  capacity?: number | null;
  active: boolean;
  created_at?: string;
  modified_at?: string;
  created_by?: string | null;
  modified_by?: string | null;
  // Optional nested joins
  union?: { union_id: number; name: string } | null;
  local_field?: { local_field_id: number; name: string } | null;
};

export type CreateCamporeeVenuePayload = {
  scope: CamporeeVenueScope;
  union_id?: number | null;
  local_field_id?: number | null;
  name: string;
  description?: string | null;
  capacity?: number | null;
  active?: boolean;
};

export type UpdateCamporeeVenuePayload = Partial<CreateCamporeeVenuePayload>;

export type ListCamporeeVenuesParams = {
  scope?: CamporeeVenueScope;
  union_id?: number;
  local_field_id?: number;
  active?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
};

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * Generic list — supports all filter params (scope, union_id, local_field_id, etc.).
 * Used internally and directly when the caller controls the filter.
 */
export async function listCamporeeVenues(params?: ListCamporeeVenuesParams) {
  return apiRequest<unknown>("/camporee-venues", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * List venues accessible to a local camporee (scoped to its local_field
 * PLUS all union-scoped venues of the parent union).
 */
export async function listLocalCamporeeVenues(camporeeId: number) {
  return apiRequest<unknown>(`/local-camporees/${camporeeId}/venues`);
}

/**
 * List venues accessible to a union camporee (scoped to the union only).
 */
export async function listUnionCamporeeVenues(camporeeId: number) {
  return apiRequest<unknown>(`/union-camporees/${camporeeId}/venues`);
}

/** Get a single venue by ID. */
export async function getCamporeeVenue(id: number) {
  return apiRequest<unknown>(`/camporee-venues/${id}`);
}

/** Create a venue (scope, union_id or local_field_id must match). */
export async function createCamporeeVenue(payload: CreateCamporeeVenuePayload) {
  return apiRequest("/camporee-venues", { method: "POST", body: payload });
}

/** Create a venue scoped to a local camporee's local_field. */
export async function createLocalCamporeeVenue(
  camporeeId: number,
  payload: Omit<CreateCamporeeVenuePayload, "scope" | "union_id" | "local_field_id">,
) {
  return apiRequest(`/local-camporees/${camporeeId}/venues`, {
    method: "POST",
    body: payload,
  });
}

/** Create a venue scoped to a union camporee's union. */
export async function createUnionCamporeeVenue(
  camporeeId: number,
  payload: Omit<CreateCamporeeVenuePayload, "scope" | "union_id" | "local_field_id">,
) {
  return apiRequest(`/union-camporees/${camporeeId}/venues`, {
    method: "POST",
    body: payload,
  });
}

/** Update a venue's name, capacity, description, notes, or active flag. */
export async function updateCamporeeVenue(
  id: number,
  payload: UpdateCamporeeVenuePayload,
) {
  return apiRequest(`/camporee-venues/${id}`, { method: "PATCH", body: payload });
}

/** Soft-delete a venue (sets active = false). */
export async function deleteCamporeeVenue(id: number) {
  return apiRequest(`/camporee-venues/${id}`, { method: "DELETE" });
}
