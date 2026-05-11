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

/** name only — used for countries, unions, local-fields, districts, churches, club-types */
export type NameOnlyPayload = {
  name: string;
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

export async function createAdminUnion(payload: NameOnlyPayload) {
  return apiRequest("/admin/unions", { method: "POST", body: payload });
}

export async function updateAdminUnion(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/unions/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminUnion(id: number) {
  return apiRequest(`/admin/unions/${id}`, { method: "DELETE" });
}

// ─── Local Fields ─────────────────────────────────────────────────────────────

export async function listAdminLocalFields(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/local-fields", { params });
}

export async function createAdminLocalField(payload: NameOnlyPayload) {
  return apiRequest("/admin/local-fields", { method: "POST", body: payload });
}

export async function updateAdminLocalField(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/local-fields/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminLocalField(id: number) {
  return apiRequest(`/admin/local-fields/${id}`, { method: "DELETE" });
}

// ─── Districts ────────────────────────────────────────────────────────────────
// Note: backend PK field is district_id aliasing districlub_type_id in the schema.

export async function listAdminDistricts(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/districts", { params });
}

export async function createAdminDistrict(payload: NameOnlyPayload) {
  return apiRequest("/admin/districts", { method: "POST", body: payload });
}

export async function updateAdminDistrict(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/districts/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminDistrict(id: number) {
  return apiRequest(`/admin/districts/${id}`, { method: "DELETE" });
}

// ─── Churches ─────────────────────────────────────────────────────────────────

export async function listAdminChurches(params?: Record<string, string | number | boolean>) {
  return apiRequest<unknown>("/admin/churches", { params });
}

export async function createAdminChurch(payload: NameOnlyPayload) {
  return apiRequest("/admin/churches", { method: "POST", body: payload });
}

export async function updateAdminChurch(id: number, payload: Partial<NameOnlyPayload>) {
  return apiRequest(`/admin/churches/${id}`, { method: "PATCH", body: payload });
}

export async function deleteAdminChurch(id: number) {
  return apiRequest(`/admin/churches/${id}`, { method: "DELETE" });
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
