import type { AuthUser } from "@/lib/auth/types";

export type ActiveClubContext = {
  clubId: number;
  sectionId: number;
  clubName?: string | null;
  clubType?: string | null;
  roleName?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickPositiveInt(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return null;
}

function fromAuthorizationScope(user: AuthUser): ActiveClubContext | null {
  const authorization = user.authorization;
  if (!isRecord(authorization)) {
    return null;
  }

  const effective = authorization.effective;
  if (!isRecord(effective)) {
    return null;
  }

  const scope = effective.scope;
  if (!isRecord(scope)) {
    return null;
  }

  const clubScope = scope.club;
  if (!isRecord(clubScope)) {
    return null;
  }

  const clubNode = clubScope.club;
  const sectionNode = clubScope.section;
  if (!isRecord(clubNode) || !isRecord(sectionNode)) {
    return null;
  }

  const clubId = pickPositiveInt(clubNode.club_id);
  const sectionId = pickPositiveInt(sectionNode.club_section_id);
  if (!clubId || !sectionId) {
    return null;
  }

  return {
    clubId,
    sectionId,
    clubName: typeof clubNode.club_name === "string" ? clubNode.club_name : null,
    clubType:
      typeof sectionNode.club_type_name === "string" ? sectionNode.club_type_name : null,
    roleName: typeof clubScope.role_name === "string" ? clubScope.role_name : null,
  };
}

function fromLegacyClubContext(user: AuthUser): ActiveClubContext | null {
  const clubContext = user.club_context;
  if (!isRecord(clubContext)) {
    return null;
  }

  const active = clubContext.active;
  if (!isRecord(active)) {
    return null;
  }

  const clubId = pickPositiveInt(active.club_id);
  const sectionId = pickPositiveInt(
    active.club_section_id,
    active.instance_id,
    active.section_id,
  );

  if (!clubId || !sectionId) {
    return null;
  }

  return {
    clubId,
    sectionId,
    clubName: typeof active.club_name === "string" ? active.club_name : null,
    clubType: typeof active.club_type === "string" ? active.club_type : null,
    roleName: typeof active.role_name === "string" ? active.role_name : null,
  };
}

/**
 * Resolves the active club + section from /auth/me authorization payload.
 */
export function resolveActiveClubContext(user: AuthUser): ActiveClubContext | null {
  return fromAuthorizationScope(user) ?? fromLegacyClubContext(user);
}
