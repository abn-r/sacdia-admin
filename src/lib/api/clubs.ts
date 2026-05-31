import { apiRequest } from "@/lib/api/client";

export type Club = {
  club_id: number;
  name: string;
  description?: string | null;
  active: boolean;
  local_field_id: number;
  district_id?: number;
  districlub_type_id?: number;
  church_id: number;
  address?: string | null;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
};

export type ClubListQuery = {
  page?: number;
  limit?: number;
  clubTypeId?: number;
  localFieldId?: number;
  districtId?: number;
  churchId?: number;
  active?: boolean;
};

export type ClubPayload = {
  name: string;
  description?: string;
  local_field_id: number;
  district_id: number;
  church_id: number;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  active?: boolean;
};

export type ClubSection = {
  club_section_id: number;
  club_type_id: number;
  club_type?: { name?: string; slug?: string } | null;
  name: string;
  active: boolean;
  souls_target?: number;
  fee?: number;
  meeting_day?: Array<{ day: string }>;
  meeting_time?: Array<{ time: string }>;
  members_count?: number;
};

export type ClubSectionPayload = {
  club_type_id: number;
  name?: string;
  souls_target?: number;
  fee?: number;
  meeting_day?: Array<{ day: string }>;
  meeting_time?: Array<{ time: string }>;
  active?: boolean;
};

export type ClubSectionMembersQuery = {
  yearId?: number;
  active?: boolean;
};

export type ClubSectionMember = {
  assignment_id?: string;
  user_id: string;
  club_section_id?: number;
  name: string;
  picture_url?: string | null;
  role?: string | null;
  role_display_name?: string | null;
  role_id?: string;
  start_date?: string;
  active?: boolean;
};

export type ClubRoleAssignmentCreatePayload = {
  user_id: string;
  role_id: string;
  ecclesiastical_year_id: number;
  start_date: string;
  end_date?: string;
};

export type ClubRoleAssignmentUpdatePayload = {
  role_id?: string;
  ecclesiastical_year_id?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
};

export type ClubDirectorSuccessionPayload = {
  current_assignment_id: string;
  successor_user_id: string;
  ecclesiastical_year_id: number;
  start_date?: string;
};

export async function listClubs(query: ClubListQuery = {}) {
  return apiRequest("/clubs", { params: query });
}

export async function getClubById(clubId: number) {
  return apiRequest(`/clubs/${clubId}`);
}

export async function createClub(payload: ClubPayload) {
  return apiRequest("/clubs", {
    method: "POST",
    body: payload,
  });
}

export async function updateClub(clubId: number, payload: Partial<ClubPayload>) {
  return apiRequest(`/clubs/${clubId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteClub(clubId: number) {
  return apiRequest(`/clubs/${clubId}`, {
    method: "DELETE",
  });
}

export async function listClubSections(clubId: number) {
  return apiRequest(`/clubs/${clubId}/sections`);
}

/**
 * Alias of {@link listClubSections}. Returns the same payload — kept as a
 * distinct named export so callers can express intent (single-club lookup
 * for dropdowns) without re-reading the schema.
 */
export async function getClubSections(clubId: number) {
  return listClubSections(clubId);
}

export async function createClubSection(clubId: number, payload: ClubSectionPayload) {
  return apiRequest(`/clubs/${clubId}/sections`, {
    method: "POST",
    body: payload,
  });
}

export async function updateClubSection(
  clubId: number,
  sectionId: number,
  payload: Partial<ClubSectionPayload>,
) {
  return apiRequest(`/clubs/${clubId}/sections/${sectionId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listClubSectionMembers(
  clubId: number,
  sectionId: number,
  query: ClubSectionMembersQuery = {},
) {
  return apiRequest(`/clubs/${clubId}/sections/${sectionId}/members`, {
    params: query,
  });
}

export async function createClubRoleAssignment(
  clubId: number,
  sectionId: number,
  payload: ClubRoleAssignmentCreatePayload,
) {
  return apiRequest(`/clubs/${clubId}/sections/${sectionId}/roles`, {
    method: "POST",
    body: payload,
  });
}

export async function updateClubRoleAssignment(
  assignmentId: string,
  payload: ClubRoleAssignmentUpdatePayload,
) {
  return apiRequest(`/club-roles/${assignmentId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function revokeClubRoleAssignment(assignmentId: string) {
  return apiRequest(`/club-roles/${assignmentId}`, {
    method: "DELETE",
  });
}

export async function succeedClubSectionDirector(
  clubId: number,
  sectionId: number,
  payload: ClubDirectorSuccessionPayload,
) {
  return apiRequest(`/clubs/${clubId}/sections/${sectionId}/director-succession`, {
    method: "POST",
    body: payload,
  });
}

// ─── Club-level member aggregation ───────────────────────────────────────────

type RawMember = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeMember(
  raw: RawMember,
  sectionId?: number,
): ClubSectionMember | null {
  const user = asRecord(raw.users);
  const role = asRecord(raw.roles);

  const user_id =
    typeof raw.user_id === "string" && raw.user_id.trim().length > 0
      ? raw.user_id.trim()
      : null;
  if (!user_id) return null;

  const nestedName = [
    pickString(user, "name"),
    pickString(user, "paternal_last_name"),
    pickString(user, "maternal_last_name"),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const name =
    typeof raw.name === "string" && raw.name.trim().length > 0
      ? raw.name.trim()
      : nestedName.length > 0
        ? nestedName
      : user_id;

  return {
    assignment_id: typeof raw.assignment_id === "string" ? raw.assignment_id : undefined,
    user_id,
    club_section_id:
      typeof raw.club_section_id === "number" ? raw.club_section_id : sectionId,
    name,
    picture_url:
      typeof raw.picture_url === "string"
        ? raw.picture_url
        : pickString(user, "user_image"),
    role:
      typeof raw.role === "string"
        ? raw.role
        : pickString(role, "role_name"),
    role_display_name: typeof raw.role_display_name === "string" ? raw.role_display_name : null,
    role_id:
      typeof raw.role_id === "string"
        ? raw.role_id
        : (pickString(role, "role_id") ?? undefined),
    active: raw.active !== false,
  };
}

function unwrapMembers(payload: unknown): unknown[] {
  return Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { data?: unknown })?.data)
      ? ((payload as { data: unknown[] }).data)
      : [];
}

export async function listNormalizedClubSectionMembers(
  clubId: number,
  sectionId: number,
  query: ClubSectionMembersQuery = {},
): Promise<ClubSectionMember[]> {
  const payload = await listClubSectionMembers(clubId, sectionId, query);
  return unwrapMembers(payload)
    .map((raw) => normalizeMember(raw as RawMember, sectionId))
    .filter((member): member is ClubSectionMember => member !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/**
 * Fetches all members for a club by first listing sections then aggregating
 * their members. Members are deduplicated by user_id (first occurrence wins).
 * Falls back to an empty array if any section call fails or returns nothing.
 */
export async function listClubMembers(clubId: number): Promise<ClubSectionMember[]> {
  let sectionsRaw: unknown;
  try {
    sectionsRaw = await apiRequest(`/clubs/${clubId}/sections`);
  } catch {
    return [];
  }

  const sections: Array<{ club_section_id: number }> = [];
  const sectionsArr = Array.isArray(sectionsRaw)
    ? sectionsRaw
    : Array.isArray((sectionsRaw as { data?: unknown })?.data)
      ? ((sectionsRaw as { data: unknown[] }).data)
      : [];

  for (const s of sectionsArr) {
    const rec = s as Record<string, unknown>;
    const id = typeof rec.club_section_id === "number" ? rec.club_section_id : null;
    if (id !== null) sections.push({ club_section_id: id });
  }

  if (sections.length === 0) return [];

  const results = await Promise.allSettled(
    sections.map((s) =>
      apiRequest(`/clubs/${clubId}/sections/${s.club_section_id}/members`),
    ),
  );

  const seen = new Set<string>();
  const members: ClubSectionMember[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status !== "fulfilled") continue;
    const payload = result.value;
    const arr = unwrapMembers(payload);
    const sectionId = sections[index]?.club_section_id;

    for (const raw of arr) {
      const member = normalizeMember(raw as RawMember, sectionId);
      if (!member || seen.has(member.user_id)) continue;
      seen.add(member.user_id);
      members.push(member);
    }
  }

  return members.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
