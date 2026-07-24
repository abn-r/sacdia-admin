"use server";

/**
 * Server actions for camporee venues.
 *
 * createCamporeeVenueAction — scoped to a local camporee's local_field.
 *   Called from VenueCreateDialog (inline creation from event form).
 *
 * updateCamporeeVenueAction — update name/capacity/description.
 * deleteCamporeeVenueAction — soft-delete (sets active = false).
 */

import { revalidatePath } from "next/cache";
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
  createLocalCamporeeVenue,
  createUnionCamporeeVenue,
  updateCamporeeVenue,
  deleteCamporeeVenue,
  type CamporeeVenue,
} from "@/lib/api/camporee-venues";

// ─── Shared action state ───────────────────────────────────────────────────────

export type CamporeeVenueActionState = {
  error?: string;
  venue?: CamporeeVenue;
};

// ─── Actions ───────────────────────────────────────────────────────────────────

/**
 * Create a venue scoped to a local camporee's local_field.
 * Scope (local_field) is auto-derived by the backend from the camporee record.
 */
export async function createCamporeeVenueAction(input: {
  camporeeId: number;
  isUnionCamporee?: boolean;
  name: string;
  capacity?: number;
  description?: string;
}): Promise<CamporeeVenueActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_CREATE, CAMPOREES_CREATE])) {
    return { error: "Sin permisos para crear sedes." };
  }

  if (!input.name?.trim()) {
    return { error: "El nombre de la sede es obligatorio." };
  }

  try {
    const result = input.isUnionCamporee
      ? await createUnionCamporeeVenue(input.camporeeId, {
          name: input.name.trim(),
          capacity: input.capacity,
          description: input.description,
        })
      : await createLocalCamporeeVenue(input.camporeeId, {
          name: input.name.trim(),
          capacity: input.capacity,
          description: input.description,
        });

    // Extract the venue from the response envelope
    const venue = extractVenue(result);
    if (!venue) {
      return { error: "La sede fue creada pero no se pudo leer la respuesta." };
    }

    revalidatePath(
      input.isUnionCamporee
        ? `/dashboard/campamentos/union/${input.camporeeId}`
        : `/dashboard/campamentos/${input.camporeeId}`,
    );
    return { venue };
  } catch (error) {
    const endpointLabel = input.isUnionCamporee
      ? `/union-camporees/${input.camporeeId}/venues`
      : `/local-camporees/${input.camporeeId}/venues`;
    return {
      error: getActionErrorMessage(
        error,
        "No se pudo crear la sede.",
        { endpointLabel },
      ),
    };
  }
}

/** Update a venue's mutable fields. */
export async function updateCamporeeVenueAction(
  id: number,
  camporeeId: number,
  input: {
    name?: string;
    capacity?: number | null;
    description?: string | null;
    active?: boolean;
  },
): Promise<CamporeeVenueActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_UPDATE, CAMPOREES_UPDATE])) {
    return { error: "Sin permisos para editar sedes." };
  }

  try {
    const result = await updateCamporeeVenue(id, input);
    const venue = extractVenue(result);
    revalidatePath(`/dashboard/campamentos/${camporeeId}`);
    return { venue: venue ?? undefined };
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo actualizar la sede.", {
        endpointLabel: `/camporee-venues/${id}`,
      }),
    };
  }
}

/** Soft-delete a venue (sets active = false). */
export async function deleteCamporeeVenueAction(
  id: number,
  camporeeId: number,
): Promise<CamporeeVenueActionState> {
  const user = await requireAdminUser();
  if (!hasAnyPermission(user, [CAMPOREE_EVENTS_DELETE, CAMPOREES_DELETE])) {
    return { error: "Sin permisos para eliminar sedes." };
  }

  try {
    await deleteCamporeeVenue(id);
    revalidatePath(`/dashboard/campamentos/${camporeeId}`);
    return {};
  } catch (error) {
    return {
      error: getActionErrorMessage(error, "No se pudo eliminar la sede.", {
        endpointLabel: `/camporee-venues/${id}`,
      }),
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractVenue(payload: unknown): CamporeeVenue | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  // Some endpoints return { data: { ... } } envelopes
  const candidate = root.data && typeof root.data === "object" ? root.data : root;
  const r = candidate as Record<string, unknown>;
  if (typeof r.camporee_venue_id === "number") return r as unknown as CamporeeVenue;
  return null;
}
