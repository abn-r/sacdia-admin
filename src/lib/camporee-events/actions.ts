"use server";

/**
 * Server actions for camporee event templates and instances.
 *
 * Templates: create / update / delete
 * Instances: create (custom + from-template) / update / delete / reorder
 *
 * Follows the same pattern as lib/generic-catalogs-i18n/actions.ts:
 *   - requireAdminUser for auth
 *   - hasAnyPermission for RBAC
 *   - revalidatePath + redirect on success
 *   - getActionErrorMessage on failure
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_CREATE,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREE_EVENTS_DELETE,
  CAMPOREES_CREATE,
  CAMPOREES_UPDATE,
  CAMPOREES_DELETE,
} from "@/lib/auth/permissions";
import {
  createCamporeeEventTemplate,
  updateCamporeeEventTemplate,
  deleteCamporeeEventTemplate,
  createLocalCamporeeEvent,
  createUnionCamporeeEvent,
  cloneTemplateToLocalCamporee,
  cloneTemplateToUnionCamporee,
  updateCamporeeEvent,
  deleteCamporeeEvent,
  reorderCamporeeEvent,
  type CreateCamporeeEventTemplatePayload,
  type UpdateCamporeeEventTemplatePayload,
  type CreateCamporeeEventPayload,
  type PenaltyRule,
  type ParticipantsByClass,
  type ParticipantsMode,
  type TemplateScope,
} from "@/lib/api/camporee-events";

// ─── Shared action state ───────────────────────────────────────────────────────

export type CamporeeEventActionState = { error?: string };

// ─── FormData helpers ──────────────────────────────────────────────────────────

function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string): string | null {
  const v = getString(formData, key);
  return v.length > 0 ? v : null;
}

function getPositiveInt(formData: FormData, key: string): number | null {
  const raw = getString(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

function getNonNegativeInt(formData: FormData, key: string): number | null {
  const raw = getString(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function getBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/**
 * Parses a JSON field from FormData; returns undefined on parse error.
 */
function getJson<T>(formData: FormData, key: string): T | undefined {
  const raw = getString(formData, key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Extracts all template fields from FormData.
 */
function buildTemplatePayload(
  formData: FormData,
): CreateCamporeeEventTemplatePayload | { validationError: string } {
  const scope = getString(formData, "scope") as TemplateScope;
  if (scope !== "union" && scope !== "local_field") {
    return { validationError: "El alcance del template es inválido." };
  }

  const event_type_id = getPositiveInt(formData, "event_type_id");
  if (!event_type_id) {
    return { validationError: "El tipo de evento es obligatorio." };
  }

  const title = getString(formData, "title");
  if (!title) {
    return { validationError: "El título es obligatorio." };
  }

  const max_points = getNonNegativeInt(formData, "max_points");
  if (max_points === null) {
    return { validationError: "El puntaje máximo es obligatorio." };
  }

  const participants_mode = getString(formData, "participants_mode") as ParticipantsMode;
  if (participants_mode !== "count" && participants_mode !== "by_class") {
    return { validationError: "El modo de participantes es inválido." };
  }

  const union_id = getPositiveInt(formData, "union_id");
  const local_field_id = getPositiveInt(formData, "local_field_id");
  const min_points = getNonNegativeInt(formData, "min_points") ?? 0;
  const penalties = getJson<PenaltyRule[]>(formData, "penalties") ?? [];
  const participants_count = getPositiveInt(formData, "participants_count");
  const participants_by_class = getJson<ParticipantsByClass[]>(formData, "participants_by_class");
  const duration_seconds = getPositiveInt(formData, "duration_seconds");
  const active = getBoolean(formData, "active");

  return {
    scope,
    union_id: scope === "union" ? union_id : null,
    local_field_id: scope === "local_field" ? local_field_id : null,
    event_type_id,
    title,
    description: getOptionalString(formData, "description"),
    requirements: getOptionalString(formData, "requirements"),
    development: getOptionalString(formData, "development"),
    prerequisites: getOptionalString(formData, "prerequisites"),
    materials: getOptionalString(formData, "materials"),
    auxiliaries: getOptionalString(formData, "auxiliaries"),
    max_points,
    min_points,
    penalties,
    participants_mode,
    participants_count: participants_mode === "count" ? participants_count : null,
    participants_by_class: participants_mode === "by_class" ? participants_by_class : null,
    duration_seconds,
    active,
  };
}

// ─── Template actions ──────────────────────────────────────────────────────────

const TEMPLATES_PATH = "/dashboard/camporees/event-templates";

export async function createCamporeeEventTemplateAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para crear templates." };
  }

  const payload = buildTemplatePayload(formData);
  if ("validationError" in payload) {
    return { error: payload.validationError };
  }

  try {
    await createCamporeeEventTemplate(payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el template.", {
        endpointLabel: TEMPLATES_PATH,
      }),
    };
  }

  revalidatePath(TEMPLATES_PATH);
  redirect(TEMPLATES_PATH);
}

export async function updateCamporeeEventTemplateAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para editar templates." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el template a editar." };

  const built = buildTemplatePayload(formData);
  if ("validationError" in built) {
    return { error: built.validationError };
  }

  const payload: UpdateCamporeeEventTemplatePayload = built;

  try {
    await updateCamporeeEventTemplate(id, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el template.", {
        endpointLabel: `${TEMPLATES_PATH}/${id}`,
      }),
    };
  }

  revalidatePath(TEMPLATES_PATH);
  redirect(TEMPLATES_PATH);
}

export async function deleteCamporeeEventTemplateAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE])) {
    return { error: "Sin permisos para eliminar templates." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el template a eliminar." };

  try {
    await deleteCamporeeEventTemplate(id);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el template.", {
        endpointLabel: `${TEMPLATES_PATH}/${id}`,
      }),
    };
  }

  revalidatePath(TEMPLATES_PATH);
  redirect(TEMPLATES_PATH);
}

// ─── Instance actions ──────────────────────────────────────────────────────────

/**
 * Extracts instance event payload from FormData (same fields as template
 * minus scope/union_id/local_field_id which are determined by the parent camporee).
 */
function buildInstancePayload(
  formData: FormData,
): CreateCamporeeEventPayload | { validationError: string } {
  const event_type_id = getPositiveInt(formData, "event_type_id");
  if (!event_type_id) {
    return { validationError: "El tipo de evento es obligatorio." };
  }

  const title = getString(formData, "title");
  if (!title) {
    return { validationError: "El título es obligatorio." };
  }

  const max_points = getNonNegativeInt(formData, "max_points");
  if (max_points === null) {
    return { validationError: "El puntaje máximo es obligatorio." };
  }

  const participants_mode = getString(formData, "participants_mode") as ParticipantsMode;
  if (participants_mode !== "count" && participants_mode !== "by_class") {
    return { validationError: "El modo de participantes es inválido." };
  }

  const min_points = getNonNegativeInt(formData, "min_points") ?? 0;
  const penalties = getJson<PenaltyRule[]>(formData, "penalties") ?? [];
  const participants_count = getPositiveInt(formData, "participants_count");
  const participants_by_class = getJson<ParticipantsByClass[]>(formData, "participants_by_class");
  const duration_seconds = getPositiveInt(formData, "duration_seconds");
  const display_order = getNonNegativeInt(formData, "display_order") ?? 0;
  const active = getBoolean(formData, "active");

  return {
    event_type_id,
    title,
    description: getOptionalString(formData, "description"),
    requirements: getOptionalString(formData, "requirements"),
    development: getOptionalString(formData, "development"),
    prerequisites: getOptionalString(formData, "prerequisites"),
    materials: getOptionalString(formData, "materials"),
    auxiliaries: getOptionalString(formData, "auxiliaries"),
    max_points,
    min_points,
    penalties,
    participants_mode,
    participants_count: participants_mode === "count" ? participants_count : null,
    participants_by_class: participants_mode === "by_class" ? participants_by_class : null,
    duration_seconds,
    display_order,
    active,
  };
}

/** Create a custom event on a local camporee. */
export async function createLocalCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para crear eventos." };
  }

  const camporeeId = getPositiveInt(formData, "camporee_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };

  const payload = buildInstancePayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await createLocalCamporeeEvent(camporeeId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/local-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  redirect(`/dashboard/camporees/${camporeeId}?tab=events`);
}

/** Create a custom event on a union camporee. */
export async function createUnionCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para crear eventos." };
  }

  const camporeeId = getPositiveInt(formData, "camporee_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };

  const payload = buildInstancePayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await createUnionCamporeeEvent(camporeeId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/union-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/union/${camporeeId}`);
  redirect(`/dashboard/camporees/union/${camporeeId}?tab=events`);
}

/** Clone a template into a local camporee. */
export async function cloneTemplateToLocalCamporeeAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para agregar eventos." };
  }

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const templateId = getPositiveInt(formData, "template_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };
  if (!templateId) return { error: "No se pudo identificar el template." };

  try {
    await cloneTemplateToLocalCamporee(camporeeId, templateId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo agregar el evento desde template.", {
        endpointLabel: `/local-camporees/${camporeeId}/events/from-template/${templateId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  redirect(`/dashboard/camporees/${camporeeId}?tab=events`);
}

/** Clone a template into a union camporee. */
export async function cloneTemplateToUnionCamporeeAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para agregar eventos." };
  }

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const templateId = getPositiveInt(formData, "template_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };
  if (!templateId) return { error: "No se pudo identificar el template." };

  try {
    await cloneTemplateToUnionCamporee(camporeeId, templateId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo agregar el evento desde template.", {
        endpointLabel: `/union-camporees/${camporeeId}/events/from-template/${templateId}`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/union/${camporeeId}`);
  redirect(`/dashboard/camporees/union/${camporeeId}?tab=events`);
}

/** Update an existing event instance. */
export async function updateCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para editar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento a editar." };

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const isUnion = formData.get("is_union") === "true";

  const payload = buildInstancePayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await updateCamporeeEvent(id, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/camporees/union/${camporeeId}`
      : `/dashboard/camporees/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/camporees");
}

/** Delete an event instance. */
export async function deleteCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE])) {
    return { error: "Sin permisos para eliminar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento a eliminar." };

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const isUnion = formData.get("is_union") === "true";

  try {
    await deleteCamporeeEvent(id);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/camporees/union/${camporeeId}`
      : `/dashboard/camporees/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/camporees");
}

// ─── Agenda-aware instance actions (PR6a/6b/6c) ────────────────────────────────

/**
 * Builds the agenda scheduling payload from FormData.
 * Used by createCamporeeAgendaEventAction / updateCamporeeAgendaEventAction.
 */
function buildAgendaPayload(
  formData: FormData,
): CreateCamporeeEventPayload | { validationError: string } {
  const title = getString(formData, "title");
  if (!title) return { validationError: "El título es obligatorio." };

  const day_number = getPositiveInt(formData, "day_number") ?? 1;
  const starts_at = getOptionalString(formData, "starts_at");
  const ends_at = getOptionalString(formData, "ends_at");

  // Validate time format HH:MM if provided
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (starts_at && !timeRegex.test(starts_at)) {
    return { validationError: "Formato de hora de inicio inválido (HH:MM)." };
  }
  if (ends_at && !timeRegex.test(ends_at)) {
    return { validationError: "Formato de hora de fin inválido (HH:MM)." };
  }
  if (starts_at && ends_at && starts_at >= ends_at) {
    return { validationError: "La hora de fin debe ser posterior a la hora de inicio." };
  }

  const display_category = getString(formData, "display_category") as CreateCamporeeEventPayload["display_category"];
  const status = getString(formData, "status") as CreateCamporeeEventPayload["status"];

  const venue_id = getPositiveInt(formData, "venue_id");
  const leader_user_id = getOptionalString(formData, "leader_user_id");
  const leader_name_override = getOptionalString(formData, "leader_name_override");
  const leader_role = getOptionalString(formData, "leader_role");

  // Sections: JSON array of CamporeeEventSection values
  const sectionsRaw = getString(formData, "sections");
  let sections: string[] = [];
  try {
    const parsed = JSON.parse(sectionsRaw);
    if (Array.isArray(parsed)) sections = parsed as string[];
  } catch {
    sections = [];
  }

  const capacity = getNonNegativeInt(formData, "capacity");
  const registered_count = getNonNegativeInt(formData, "registered_count") ?? 0;
  const max_points = getNonNegativeInt(formData, "max_points") ?? 0;

  return {
    event_type_id: 1, // default — instances use type 1 (generic) unless overridden
    title,
    description: getOptionalString(formData, "description"),
    day_number,
    starts_at,
    ends_at,
    display_category: display_category || "logistico",
    status: status || "programado",
    venue_id: venue_id ?? null,
    leader_user_id: leader_user_id || null,
    leader_name_override: leader_name_override || null,
    leader_role: leader_role || null,
    sections: (sections as import("@/lib/api/camporee-events").CamporeeEventSection[]) ?? [],
    capacity: capacity ?? null,
    registered_count,
    max_points,
    min_points: 0,
    penalties: [],
    participants_mode: "count",
    active: true,
    display_order: getNonNegativeInt(formData, "display_order") ?? 0,
  };
}

/** Create a camporee event with full agenda fields. */
export async function createCamporeeAgendaEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para crear eventos." };
  }

  const camporeeId = getPositiveInt(formData, "camporee_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };

  const payload = buildAgendaPayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await createLocalCamporeeEvent(camporeeId, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/local-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/camporees/${camporeeId}`);
  redirect(`/dashboard/camporees/${camporeeId}?tab=events`);
}

/** Update a camporee event with full agenda fields. */
export async function updateCamporeeAgendaEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para editar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento a editar." };

  const camporeeId = getPositiveInt(formData, "camporee_id");

  const payload = buildAgendaPayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await updateCamporeeEvent(id, payload);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    revalidatePath(`/dashboard/camporees/${camporeeId}`);
    redirect(`/dashboard/camporees/${camporeeId}?tab=events`);
  }

  redirect("/dashboard/camporees");
}

/** Cancel an event (sets status = 'cancelado'). Requires AlertDialog confirm on the caller side. */
export async function cancelCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para cancelar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento a cancelar." };

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const isUnion = formData.get("is_union") === "true";

  try {
    await updateCamporeeEvent(id, { status: "cancelado" });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo cancelar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/camporees/union/${camporeeId}`
      : `/dashboard/camporees/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/camporees");
}

/** Soft-delete an event (sets active = false). Requires AlertDialog confirm on the caller side. */
export async function softDeleteCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE])) {
    return { error: "Sin permisos para eliminar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento a eliminar." };

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const isUnion = formData.get("is_union") === "true";

  try {
    // Soft delete: PATCH active = false (keeps the row for historical record)
    await updateCamporeeEvent(id, { active: false });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/camporees/union/${camporeeId}`
      : `/dashboard/camporees/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/camporees");
}

/** Reorder an event instance. */
export async function reorderCamporeeEventAction(
  _: CamporeeEventActionState,
  formData: FormData,
): Promise<CamporeeEventActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para reordenar eventos." };
  }

  const id = getPositiveInt(formData, "id");
  if (!id) return { error: "No se pudo identificar el evento." };

  const display_order = getNonNegativeInt(formData, "display_order");
  if (display_order === null) return { error: "El orden es inválido." };

  const camporeeId = getPositiveInt(formData, "camporee_id");
  const isUnion = formData.get("is_union") === "true";

  try {
    await reorderCamporeeEvent(id, { display_order });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo reordenar el evento.", {
        endpointLabel: `/camporee-events/${id}/reorder`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/camporees/union/${camporeeId}`
      : `/dashboard/camporees/${camporeeId}`;
    revalidatePath(basePath);
  }

  return {};
}
