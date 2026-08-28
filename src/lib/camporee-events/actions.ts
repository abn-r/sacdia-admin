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
  listLocalFieldsForTerritory,
  listUnionsForTerritory,
  resolveAdminTerritoryScope,
} from "@/lib/auth/territory-scope";
import type { AuthUser } from "@/lib/auth/types";
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
  type CamporeeEventScheduleBlock,
  type CreateCamporeeEventPayload,
  type PenaltyRule,
  type ParticipantsByClass,
  type ParticipantsMode,
  type TemplateScope,
} from "@/lib/api/camporee-events";
import {
  replaceCamporeeEventRubrics,
  type CamporeeTemplateRubricInput,
} from "@/lib/api/camporee-scoring";

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
 * Strip read-only / relation fields from schedule blocks before API write.
 * Backend ValidationPipe uses forbidNonWhitelisted — sending assignment IDs,
 * nested camporee_club/club_section, audit fields, etc. fails hard.
 */
function sanitizeScheduleBlocksForWrite(
  blocks: CamporeeEventScheduleBlock[],
): CamporeeEventScheduleBlock[] {
  return blocks.map((block) => {
    const startsAt =
      typeof block.starts_at === "string" && block.starts_at.trim()
        ? block.starts_at.trim()
        : null;
    const endsAt =
      typeof block.ends_at === "string" && block.ends_at.trim()
        ? block.ends_at.trim()
        : null;

    const assignments = (block.assignments ?? [])
      .map((assignment) => {
        const clubSectionId = Number(assignment.club_section_id);
        if (!Number.isFinite(clubSectionId) || clubSectionId < 1) return null;
        const camporeeClubId =
          assignment.camporee_club_id != null
            ? Number(assignment.camporee_club_id)
            : null;
        return {
          club_section_id: clubSectionId,
          ...(camporeeClubId != null &&
          Number.isFinite(camporeeClubId) &&
          camporeeClubId >= 1
            ? { camporee_club_id: camporeeClubId }
            : {}),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    return {
      title: block.title?.trim() ? block.title.trim() : undefined,
      description: block.description?.trim() ? block.description.trim() : undefined,
      day_number:
        typeof block.day_number === "number" && block.day_number >= 1
          ? block.day_number
          : 1,
      ...(startsAt ? { starts_at: startsAt } : {}),
      ...(endsAt ? { ends_at: endsAt } : {}),
      ...(typeof block.venue_id === "number" && block.venue_id >= 1
        ? { venue_id: block.venue_id }
        : {}),
      ...(typeof block.capacity === "number" && block.capacity >= 0
        ? { capacity: block.capacity }
        : {}),
      ...(block.notes?.trim() ? { notes: block.notes.trim() } : {}),
      ...(assignments.length > 0 ? { assignments } : {}),
    };
  });
}

function extractCreatedEventId(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const candidate =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;
  const id = Number(candidate.camporee_event_id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function syncRubricsFromForm(eventId: number, formData: FormData) {
  if (!formData.has("scoring_enabled") && !formData.has("rubrics")) return;

  await replaceCamporeeEventRubrics(eventId, {
    scoring_enabled: getBoolean(formData, "scoring_enabled"),
    items: getJson<CamporeeTemplateRubricInput[]>(formData, "rubrics") ?? [],
  });
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
  const scoring_enabled = getBoolean(formData, "scoring_enabled");
  const rubrics = getJson<CamporeeTemplateRubricInput[]>(formData, "rubrics") ?? [];

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
    scoring_enabled,
    rubrics,
    min_points,
    penalties,
    participants_mode,
    participants_count: participants_mode === "count" ? participants_count : null,
    participants_by_class: participants_mode === "by_class" ? participants_by_class : null,
    duration_seconds,
    active,
  };
}


async function assertTemplatePayloadInActorScope(
  user: AuthUser,
  payload: CreateCamporeeEventTemplatePayload | UpdateCamporeeEventTemplatePayload,
): Promise<string | null> {
  const territoryScope = resolveAdminTerritoryScope(user);

  if (territoryScope.level === "all") {
    return null;
  }

  if (territoryScope.level === "local_field") {
    return payload.scope === "local_field" &&
      payload.local_field_id === territoryScope.localFieldId
      ? null
      : "El alcance del template está fuera de tu campo local.";
  }

  if (payload.scope === "union") {
    const allowedUnions = await listUnionsForTerritory(user);
    return allowedUnions.some((union) => union.union_id === payload.union_id)
      ? null
      : "La unión seleccionada está fuera de tu alcance.";
  }

  if (payload.scope === "local_field") {
    const allowedLocalFields = await listLocalFieldsForTerritory(user);
    return allowedLocalFields.some(
      (field) => field.local_field_id === payload.local_field_id,
    )
      ? null
      : "El campo local seleccionado está fuera de tu alcance.";
  }

  return "El alcance del template es inválido.";
}

// ─── Template actions ──────────────────────────────────────────────────────────

const TEMPLATES_PATH = "/dashboard/campamentos/plantillas";

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

  const scopeError = await assertTemplatePayloadInActorScope(user, payload);
  if (scopeError) return { error: scopeError };

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
  const scopeError = await assertTemplatePayloadInActorScope(user, payload);
  if (scopeError) return { error: scopeError };

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
    const created = await createLocalCamporeeEvent(camporeeId, payload);
    const eventId = extractCreatedEventId(created);
    if (eventId) await syncRubricsFromForm(eventId, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/local-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/campamentos/${camporeeId}`);
  redirect(`/dashboard/campamentos/${camporeeId}?tab=events`);
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
    const created = await createUnionCamporeeEvent(camporeeId, payload);
    const eventId = extractCreatedEventId(created);
    if (eventId) await syncRubricsFromForm(eventId, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/union-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/campamentos/union/${camporeeId}`);
  redirect(`/dashboard/campamentos/union/${camporeeId}?tab=events`);
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

  revalidatePath(`/dashboard/campamentos/${camporeeId}`);
  redirect(`/dashboard/campamentos/${camporeeId}?tab=events`);
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

  revalidatePath(`/dashboard/campamentos/union/${camporeeId}`);
  redirect(`/dashboard/campamentos/union/${camporeeId}?tab=events`);
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
    await syncRubricsFromForm(id, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/campamentos");
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
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/campamentos");
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

  const max_points = getNonNegativeInt(formData, "max_points") ?? 0;
  const min_points = getNonNegativeInt(formData, "min_points") ?? 0;
  if (min_points > max_points) {
    return {
      validationError: "Los puntos mínimos no pueden superar los puntos máximos.",
    };
  }
  const penalties =
    getJson<import("@/lib/api/camporee-events").PenaltyRule[]>(
      formData,
      "penalties",
    ) ?? [];
  const event_type_id = getPositiveInt(formData, "event_type_id");
  const schedule_blocks = sanitizeScheduleBlocksForWrite(
    getJson<CamporeeEventScheduleBlock[]>(formData, "schedule_blocks") ?? [],
  );
  const honorIdsRaw = getJson<number[]>(formData, "honor_ids");
  const honor_ids = Array.isArray(honorIdsRaw)
    ? honorIdsRaw.filter((id) => Number.isInteger(id) && id > 0)
    : [];

  return {
    ...(event_type_id ? { event_type_id } : {}),
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
    max_points,
    min_points,
    penalties,
    participants_mode: "count",
    participants_count: 1,
    schedule_blocks,
    honor_ids,
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
    const created = await createLocalCamporeeEvent(camporeeId, payload);
    const eventId = extractCreatedEventId(created);
    if (eventId) await syncRubricsFromForm(eventId, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/local-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/campamentos/${camporeeId}`);
  redirect(`/dashboard/campamentos/${camporeeId}?tab=events`);
}

/** Create a union camporee event with full agenda fields. */
export async function createUnionCamporeeAgendaEventAction(
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
    const created = await createUnionCamporeeEvent(camporeeId, payload);
    const eventId = extractCreatedEventId(created);
    if (eventId) await syncRubricsFromForm(eventId, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo crear el evento.", {
        endpointLabel: `/union-camporees/${camporeeId}/events`,
      }),
    };
  }

  revalidatePath(`/dashboard/campamentos/union/${camporeeId}`);
  redirect(`/dashboard/campamentos/union/${camporeeId}?tab=events`);
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
  const isUnion = formData.get("is_union") === "true";

  const payload = buildAgendaPayload(formData);
  if ("validationError" in payload) return { error: payload.validationError };

  try {
    await updateCamporeeEvent(id, payload);
    await syncRubricsFromForm(id, formData);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar el evento.", {
        endpointLabel: `/camporee-events/${id}`,
      }),
    };
  }

  if (camporeeId) {
    const basePath = isUnion
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/campamentos");
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
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/campamentos");
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
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
    redirect(`${basePath}?tab=events`);
  }

  redirect("/dashboard/campamentos");
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
      ? `/dashboard/campamentos/union/${camporeeId}`
      : `/dashboard/campamentos/${camporeeId}`;
    revalidatePath(basePath);
  }

  return {};
}
