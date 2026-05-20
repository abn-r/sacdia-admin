/**
 * Generic Catalogs i18n — admin API client for 12 catalog targets:
 *
 * Geography (name-only):
 *   countries, unions, local-fields, districts, churches
 *
 * Reference (name + description):
 *   relationship-types, allergies, diseases, medicines, activity-types
 *
 * Reference (name-only):
 *   club-types
 *
 * Special (name + ideal + club_type_id + ideal_order):
 *   club-ideals
 *
 * All endpoints under /admin/<kebab-case>.
 * Backend PR #105 (geography) and #106 (reference) add translations support.
 */
import { apiRequest } from "@/lib/api/client";
import type { CatalogTranslation } from "@/lib/types/catalog-translation";

// ─── Shared payload types ──────────────────────────────────────────────────────

/** name + description (optional) — used for relationship-types, allergies, diseases, medicines, activity-types */
export type TranslatablePayload = {
  name: string;
  description?: string | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** name only — used for countries, club-types */
export type NameOnlyPayload = {
  name: string;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** unions — name + abbreviation + country_id (parent) */
export type UnionPayload = {
  name: string;
  abbreviation: string;
  country_id: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** local-fields — name + abbreviation + union_id (parent) */
export type LocalFieldPayload = {
  name: string;
  abbreviation: string;
  union_id: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** districts — name + local_field_id (parent) */
export type DistrictPayload = {
  name: string;
  local_field_id: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** churches — name + district_id (parent) */
export type ChurchPayload = {
  name: string;
  district_id: number;
  active?: boolean;
  translations?: CatalogTranslation[];
};

/** club-ideals specific shape — name + ideal (translatable) + relation + order */
export type ClubIdealPayload = {
  name: string;
  ideal?: string | null;
  club_type_id?: number | null;
  ideal_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

// ─── Countries ────────────────────────────────────────────────────────────────

export async function listAdminCountries(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/countries", { params });
}

export async function createAdminCountry(payload: NameOnlyPayload) {
  return apiRequest("/admin/countries", { method: "POST", body: payload });
}

export async function updateAdminCountry(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/countries/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminCountry(id: number) {
  return apiRequest(`/admin/countries/${id}`, { method: "DELETE" });
}

// ─── Unions ───────────────────────────────────────────────────────────────────

export async function listAdminUnions(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/unions", { params });
}

export async function createAdminUnion(payload: UnionPayload) {
  return apiRequest("/admin/unions", { method: "POST", body: payload });
}

export async function updateAdminUnion(id: number, payload: Partial<UnionPayload>) {
  return apiRequest(`/admin/unions/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminUnion(id: number) {
  return apiRequest(`/admin/unions/${id}`, { method: "DELETE" });
}

// ─── Local Fields ─────────────────────────────────────────────────────────────

export async function listAdminLocalFields(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/local-fields", { params });
}

export async function createAdminLocalField(payload: LocalFieldPayload) {
  return apiRequest("/admin/local-fields", { method: "POST", body: payload });
}

export async function updateAdminLocalField(id: number, payload: Partial<LocalFieldPayload>) {
  return apiRequest(`/admin/local-fields/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminLocalField(id: number) {
  return apiRequest(`/admin/local-fields/${id}`, { method: "DELETE" });
}

// ─── Districts ────────────────────────────────────────────────────────────────
// Note: backend PK field is `districlub_type_id` (legacy name). API responses
// use this field name.

export async function listAdminDistricts(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/districts", { params });
}

export async function createAdminDistrict(payload: DistrictPayload) {
  return apiRequest("/admin/districts", { method: "POST", body: payload });
}

export async function updateAdminDistrict(id: number, payload: Partial<DistrictPayload>) {
  return apiRequest(`/admin/districts/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminDistrict(id: number) {
  return apiRequest(`/admin/districts/${id}`, { method: "DELETE" });
}

// ─── Churches ─────────────────────────────────────────────────────────────────

export async function listAdminChurches(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/churches", { params });
}

export async function createAdminChurch(payload: ChurchPayload) {
  return apiRequest("/admin/churches", { method: "POST", body: payload });
}

export async function updateAdminChurch(id: number, payload: Partial<ChurchPayload>) {
  return apiRequest(`/admin/churches/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminChurch(id: number) {
  return apiRequest(`/admin/churches/${id}`, { method: "DELETE" });
}

// ─── Single-item fetch helpers for geography catalogs ─────────────────────────
// Backend currently exposes only list endpoints for unions/local-fields/
// districts/churches (no GET /:id). Until a detail endpoint exists, the edit
// pages fetch the full list and find the record by primary key client-side.
// Lists are capped at 500-2000 rows in the service, which is acceptable for
// geography catalogs (the tree is small).

function unwrapList(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];
  const wrapped = payload as { data?: unknown };
  const inner = wrapped.data !== undefined ? wrapped.data : payload;
  if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  if (inner && typeof inner === "object") {
    const items = (inner as { items?: unknown }).items;
    if (Array.isArray(items)) return items as Record<string, unknown>[];
  }
  return [];
}

function findById(
  items: Record<string, unknown>[],
  pkField: string,
  id: number,
): Record<string, unknown> | null {
  return (
    items.find((item) => {
      const raw = item[pkField];
      const num = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(num) && num === id;
    }) ?? null
  );
}

export async function getAdminUnion(id: number) {
  const payload = await listAdminUnions();
  return findById(unwrapList(payload), "union_id", id);
}

export async function getAdminLocalField(id: number) {
  const payload = await listAdminLocalFields();
  return findById(unwrapList(payload), "local_field_id", id);
}

export async function getAdminDistrict(id: number) {
  const payload = await listAdminDistricts();
  return findById(unwrapList(payload), "districlub_type_id", id);
}

export async function getAdminChurch(id: number) {
  const payload = await listAdminChurches();
  return findById(unwrapList(payload), "church_id", id);
}

// ─── Relationship Types ───────────────────────────────────────────────────────

export async function listAdminRelationshipTypes(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/relationship-types", { params });
}

export async function createAdminRelationshipType(payload: TranslatablePayload) {
  return apiRequest("/admin/relationship-types", { method: "POST", body: payload });
}

export async function updateAdminRelationshipType(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/relationship-types/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminRelationshipType(id: number) {
  return apiRequest(`/admin/relationship-types/${id}`, { method: "DELETE" });
}

// ─── Allergies ────────────────────────────────────────────────────────────────

export async function listAdminAllergies(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/allergies", { params });
}

export async function createAdminAllergy(payload: TranslatablePayload) {
  return apiRequest("/admin/allergies", { method: "POST", body: payload });
}

export async function updateAdminAllergy(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/allergies/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminAllergy(id: number) {
  return apiRequest(`/admin/allergies/${id}`, { method: "DELETE" });
}

// ─── Diseases ─────────────────────────────────────────────────────────────────

export async function listAdminDiseases(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/diseases", { params });
}

export async function createAdminDisease(payload: TranslatablePayload) {
  return apiRequest("/admin/diseases", { method: "POST", body: payload });
}

export async function updateAdminDisease(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/diseases/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminDisease(id: number) {
  return apiRequest(`/admin/diseases/${id}`, { method: "DELETE" });
}

// ─── Medicines ────────────────────────────────────────────────────────────────

export async function listAdminMedicines(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/medicines", { params });
}

export async function createAdminMedicine(payload: TranslatablePayload) {
  return apiRequest("/admin/medicines", { method: "POST", body: payload });
}

export async function updateAdminMedicine(id: number, payload: Partial<TranslatablePayload>) {
  return apiRequest(`/admin/medicines/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminMedicine(id: number) {
  return apiRequest(`/admin/medicines/${id}`, { method: "DELETE" });
}

// ─── Club Types ───────────────────────────────────────────────────────────────

export async function listAdminClubTypes(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/club-types", { params });
}

export async function createAdminClubType(payload: NameOnlyPayload) {
  return apiRequest("/admin/club-types", { method: "POST", body: payload });
}

export async function updateAdminClubType(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/club-types/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClubType(id: number) {
  return apiRequest(`/admin/club-types/${id}`, { method: "DELETE" });
}

// ─── Club Ideals ──────────────────────────────────────────────────────────────
// Translatable fields: name + ideal (NOT description).

export async function listAdminClubIdeals(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/club-ideals", { params });
}

/** Fetches a single club-ideal by ID for the edit page. */
export async function getAdminClubIdeal(id: number) {
  return apiRequest<unknown>(`/admin/club-ideals/${id}`);
}

export async function createAdminClubIdeal(payload: ClubIdealPayload) {
  return apiRequest("/admin/club-ideals", { method: "POST", body: payload });
}

export async function updateAdminClubIdeal(id: number, payload: Partial<ClubIdealPayload>) {
  return apiRequest(`/admin/club-ideals/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminClubIdeal(id: number) {
  return apiRequest(`/admin/club-ideals/${id}`, { method: "DELETE" });
}

// ─── Activity Types ───────────────────────────────────────────────────────────
// Note: `code` field is NOT translatable — only name + description.

export async function listAdminActivityTypes(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/activity-types", { params });
}

export async function createAdminActivityType(payload: TranslatablePayload & { code?: string }) {
  return apiRequest("/admin/activity-types", { method: "POST", body: payload });
}

export async function updateAdminActivityType(id: number, payload: Partial<TranslatablePayload> & { code?: string }) {
  return apiRequest(`/admin/activity-types/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminActivityType(id: number) {
  return apiRequest(`/admin/activity-types/${id}`, { method: "DELETE" });
}

// ─── Camporee Event Types ─────────────────────────────────────────────────────
// Translatable fields: name + description. Extra non-translatable: code, display_order.

export type CamporeeEventTypePayload = {
  name: string;
  description?: string | null;
  code?: string | null;
  display_order?: number | null;
  active?: boolean;
  translations?: CatalogTranslation[];
};

export async function listAdminCamporeeEventTypes(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/camporee-event-types", { params });
}

export async function getAdminCamporeeEventType(id: number) {
  return apiRequest<unknown>(`/admin/camporee-event-types/${id}`);
}

export async function createAdminCamporeeEventType(payload: CamporeeEventTypePayload) {
  return apiRequest("/admin/camporee-event-types", { method: "POST", body: payload });
}

export async function updateAdminCamporeeEventType(id: number, payload: Partial<CamporeeEventTypePayload>) {
  return apiRequest(`/admin/camporee-event-types/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminCamporeeEventType(id: number) {
  return apiRequest(`/admin/camporee-event-types/${id}`, { method: "DELETE" });
}
