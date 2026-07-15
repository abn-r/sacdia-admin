"use server";

import { revalidatePath } from "next/cache";
import { getActionErrorMessage } from "@/lib/api/action-error";
import { requireAdminUser } from "@/lib/auth/session";
import { hasAnyPermission } from "@/lib/auth/permission-utils";
import {
  CAMPOREE_EVENTS_READ,
  CAMPOREE_EVENTS_UPDATE,
  CAMPOREES_UPDATE,
} from "@/lib/auth/permissions";
import {
  addLocalCamporeeJudge,
  addUnionCamporeeJudge,
  assignCamporeeEventJudge,
  deleteCamporeeEventJudgeAssignment,
  replaceCamporeeEventRubrics,
  submitCamporeeEventScore,
  updateCamporeeEventJudgeAssignment,
  type CamporeeJudgeRole,
  type CamporeeTemplateRubricInput,
} from "@/lib/api/camporee-scoring";

export type CamporeeScoringActionState = {
  error?: string;
  success?: string;
};

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readPositiveNumber(formData: FormData, key: string): number | null {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function readJson<T>(formData: FormData, key: string, fallback: T): T {
  const raw = readString(formData, key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function getCamporeePath(camporeeId: number | null, isUnion: boolean) {
  if (!camporeeId) return "/dashboard/campamentos";
  return isUnion
    ? `/dashboard/campamentos/union/${camporeeId}`
    : `/dashboard/campamentos/${camporeeId}`;
}

async function assertCanUpdateScoring() {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return "Sin permisos para gestionar puntajes de camporee.";
  }
  return null;
}

export async function replaceCamporeeEventRubricsAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const eventId = readPositiveNumber(formData, "event_id");
  if (!eventId) return { error: "No se pudo identificar el evento." };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const isUnion = readBoolean(formData, "is_union");
  const scoringEnabled = readBoolean(formData, "scoring_enabled");
  const rubrics = readJson<CamporeeTemplateRubricInput[]>(formData, "rubrics", []);

  try {
    await replaceCamporeeEventRubrics(eventId, {
      scoring_enabled: scoringEnabled,
      items: rubrics,
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudieron guardar las rúbricas.", {
        endpointLabel: `/camporee-events/${eventId}/rubrics`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  return { success: "Rúbricas guardadas." };
}

export async function addCamporeeJudgeAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  if (!camporeeId) return { error: "No se pudo identificar el camporee." };

  const userId = readString(formData, "user_id");
  if (!userId) return { error: "El usuario juez es obligatorio." };

  const isUnion = readBoolean(formData, "is_union");
  const notes = readString(formData, "notes") || undefined;

  try {
    if (isUnion) await addUnionCamporeeJudge(camporeeId, { user_id: userId, notes });
    else await addLocalCamporeeJudge(camporeeId, { user_id: userId, notes });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo agregar el juez.", {
        endpointLabel: isUnion
          ? `/union-camporees/${camporeeId}/judges`
          : `/local-camporees/${camporeeId}/judges`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  revalidatePath("/dashboard/campamentos/jueces");
  return { success: "Juez agregado." };
}

export async function assignCamporeeEventJudgeAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const eventId = readPositiveNumber(formData, "event_id");
  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const clubSectionId = readPositiveNumber(formData, "club_section_id");
  const judgeId = readString(formData, "camporee_judge_id");
  const judgeRole = readString(formData, "judge_role") as CamporeeJudgeRole;
  const isUnion = readBoolean(formData, "is_union");

  if (!eventId || !clubSectionId || !judgeId) {
    return { error: "Faltan datos para asignar juez." };
  }
  if (judgeRole !== "primary" && judgeRole !== "assistant") {
    return { error: "El rol de juez es inválido." };
  }

  try {
    await assignCamporeeEventJudge(eventId, {
      camporee_judge_id: judgeId,
      club_section_id: clubSectionId,
      judge_role: judgeRole,
      camporee_club_id: readPositiveNumber(formData, "camporee_club_id"),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo asignar el juez.", {
        endpointLabel: `/camporee-events/${eventId}/judge-assignments`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  return { success: "Asignación guardada." };
}

export async function updateCamporeeEventJudgeAssignmentAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) return { error: "No se pudo identificar la asignación." };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const isUnion = readBoolean(formData, "is_union");
  const judgeRole = readString(formData, "judge_role") as CamporeeJudgeRole;

  try {
    await updateCamporeeEventJudgeAssignment(assignmentId, {
      ...(judgeRole === "primary" || judgeRole === "assistant"
        ? { judge_role: judgeRole }
        : {}),
      ...(formData.has("active") ? { active: readBoolean(formData, "active") } : {}),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la asignación.", {
        endpointLabel: `/camporee-event-judge-assignments/${assignmentId}`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  return { success: "Asignación actualizada." };
}

export async function deleteCamporeeEventJudgeAssignmentAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const assignmentId = readString(formData, "assignment_id");
  if (!assignmentId) return { error: "No se pudo identificar la asignación." };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const isUnion = readBoolean(formData, "is_union");

  try {
    await deleteCamporeeEventJudgeAssignment(assignmentId);
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la asignación.", {
        endpointLabel: `/camporee-event-judge-assignments/${assignmentId}`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  return { success: "Asignación eliminada." };
}

export async function submitCamporeeEventScoreAction(
  _: CamporeeScoringActionState,
  formData: FormData,
): Promise<CamporeeScoringActionState> {
  const permissionError = await assertCanUpdateScoring();
  if (permissionError) return { error: permissionError };

  const eventId = readPositiveNumber(formData, "event_id");
  const clubSectionId = readPositiveNumber(formData, "club_section_id");
  if (!eventId || !clubSectionId) return { error: "Faltan datos del puntaje." };

  const camporeeId = readPositiveNumber(formData, "camporee_id");
  const isUnion = readBoolean(formData, "is_union");
  const source = readString(formData, "source") === "admin_override"
    ? "admin_override"
    : "manual_lf";

  try {
    await submitCamporeeEventScore(eventId, clubSectionId, {
      source,
      notes: readString(formData, "notes") || undefined,
      items: readJson(formData, "items", []),
    });
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo guardar el puntaje.", {
        endpointLabel: `/camporee-events/${eventId}/sections/${clubSectionId}/scores`,
      }),
    };
  }

  revalidatePath(getCamporeePath(camporeeId, isUnion));
  return { success: "Puntaje guardado." };
}

export async function assertCanReadCamporeeScoringAction() {
  const user = await requireAdminUser();
  return hasAnyPermission(user, [CAMPOREE_EVENTS_READ, CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE]);
}
