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

export type ClubInstance = {
  instance_id: number;
  instance_type: "adventurers" | "pathfinders" | "master_guilds";
  club_type_id: number;
  name: string;
  active: boolean;
  members_count?: number;
};

export type ClubInstanceType = ClubInstance["instance_type"];

export type ClubInstancePayload = {
  type: ClubInstanceType;
  club_type_id?: number;
  name?: string;
  souls_target?: number;
  fee?: number;
  meeting_day?: Array<{ day: string }>;
  meeting_time?: Array<{ time: string }>;
  active?: boolean;
};

export type ClubInstanceMembersQuery = {
  yearId?: number;
  active?: boolean;
};

export type ClubInstanceMember = {
  user_id: string;
  name: string;
  picture_url?: string | null;
  role?: string | null;
  role_display_name?: string | null;
  role_id?: number;
  start_date?: string;
  active?: boolean;
};

export type ClubInstanceMemberPayload = {
  user_id: string;
  role_id: number;
  ecclesiastical_year_id: number;
};

export type ClubInstanceMemberRolePayload = {
  role_id: number;
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

export async function listClubInstances(clubId: number) {
  return apiRequest(`/clubs/${clubId}/instances`);
}

export async function createClubInstance(clubId: number, payload: ClubInstancePayload) {
  return apiRequest(`/clubs/${clubId}/instances`, {
    method: "POST",
    body: payload,
  });
}

export async function updateClubInstance(
  clubId: number,
  instanceType: ClubInstanceType,
  instanceId: number,
  payload: Partial<ClubInstancePayload>,
) {
  return apiRequest(`/clubs/${clubId}/instances/${instanceType}/${instanceId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function listClubInstanceMembers(
  clubId: number,
  instanceType: ClubInstanceType,
  instanceId: number,
  query: ClubInstanceMembersQuery = {},
) {
  return apiRequest(`/clubs/${clubId}/instances/${instanceType}/${instanceId}/members`, {
    params: query,
  });
}

export async function addClubInstanceMember(
  clubId: number,
  instanceType: ClubInstanceType,
  instanceId: number,
  payload: ClubInstanceMemberPayload,
) {
  return apiRequest(`/clubs/${clubId}/instances/${instanceType}/${instanceId}/members`, {
    method: "POST",
    body: payload,
  });
}

export async function updateClubInstanceMemberRole(
  clubId: number,
  instanceType: ClubInstanceType,
  instanceId: number,
  userId: string,
  payload: ClubInstanceMemberRolePayload,
) {
  return apiRequest(`/clubs/${clubId}/instances/${instanceType}/${instanceId}/members/${userId}/role`, {
    method: "PATCH",
    body: payload,
  });
}

export async function removeClubInstanceMember(
  clubId: number,
  instanceType: ClubInstanceType,
  instanceId: number,
  userId: string,
) {
  return apiRequest(`/clubs/${clubId}/instances/${instanceType}/${instanceId}/members/${userId}`, {
    method: "DELETE",
  });
}
