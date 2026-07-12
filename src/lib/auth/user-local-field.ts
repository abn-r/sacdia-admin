import type { AuthUser } from "@/lib/auth/types";

/**
 * Describes whether a session is bound to a single local_field (directors,
 * director-lf, assistant-lf) or is unscoped (admin / super-admin) and can
 * therefore address any local_field with an explicit override.
 */
export type UserLocalFieldScope =
  | { scope: "single"; localFieldId: number }
  | { scope: "all" };

type ScopeNode = { id?: number | string | null } | null | undefined;

/**
 * Reads the AuthorizationSnapshot attached to the session user and returns
 * the local_field constraint that should drive UI filters and form payloads:
 *
 *   1. effective.scope.global.local_field.id   → director-lf / assistant-lf
 *   2. effective.scope.club.local_field_id      → director (CLUB role); we
 *      fall back to legacy.club.local_field_id which the backend includes
 *      when the user has an active club assignment
 *   3. otherwise                                 → 'all'
 *
 * The backend enforces the same scope server-side via PermissionsGuard +
 * resolveActorLocalField. This helper exists so the UI can hide the LF
 * selector and pre-fill values for LF-scoped users.
 */
export function resolveUserLocalField(
  user: AuthUser | null | undefined,
): UserLocalFieldScope {
  if (!user?.authorization) return { scope: "all" };

  const effective = (user.authorization as Record<string, unknown>).effective as
    | { scope?: { global?: { local_field?: ScopeNode }; club?: unknown } }
    | undefined;

  const lfNode = effective?.scope?.global?.local_field;
  const lfNodeId = lfNode?.id;
  const lfFromTerritory =
    typeof lfNodeId === "string"
      ? parseInt(lfNodeId, 10)
      : typeof lfNodeId === "number"
        ? lfNodeId
        : null;
  if (lfFromTerritory != null && Number.isFinite(lfFromTerritory)) {
    return { scope: "single", localFieldId: lfFromTerritory };
  }

  // Fallback: legacy club hierarchy carries local_field_id for directors
  const legacy = (user.authorization as Record<string, unknown>).legacy as
    | { club?: { local_field_id?: number | null } | null }
    | undefined;
  const clubLf = legacy?.club?.local_field_id;
  if (typeof clubLf === "number" && Number.isFinite(clubLf)) {
    return { scope: "single", localFieldId: clubLf };
  }

  return { scope: "all" };
}
