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

// ─── Club-level member aggregation ───────────────────────────────────────────

type RawMember = Record<string, unknown>;

function normalizeMember(raw: RawMember): ClubSectionMember | null {
  const user_id =
    typeof raw.user_id === "string" && raw.user_id.trim().length > 0
      ? raw.user_id.trim()
      : null;
  if (!user_id) return null;

  const name =
    typeof raw.name === "string" && raw.name.trim().length > 0
      ? raw.name.trim()
      : user_id;

  return {
    assignment_id: typeof raw.assignment_id === "string" ? raw.assignment_id : undefined,
    user_id,
    name,
    picture_url: typeof raw.picture_url === "string" ? raw.picture_url : null,
    role: typeof raw.role === "string" ? raw.role : null,
    role_display_name: typeof raw.role_display_name === "string" ? raw.role_display_name : null,
    role_id: typeof raw.role_id === "string" ? raw.role_id : undefined,
    active: raw.active !== false,
  };
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

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const payload = result.value;
    const arr = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown })?.data)
        ? ((payload as { data: unknown[] }).data)
        : [];

    for (const raw of arr) {
      const member = normalizeMember(raw as RawMember);
      if (!member || seen.has(member.user_id)) continue;
      seen.add(member.user_id);
      members.push(member);
    }
  }

  return members.sort((a, b) => a.name.localeCompare(b.name, "es"));
}
