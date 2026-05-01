import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export const PLATFORM_LABELS: Record<number, string> = {
  0: "Presencial",
  1: "Virtual",
  2: "Híbrido",
};

export const ACTIVITY_TYPE_LABELS: Record<number, string> = {
  1: "Regular",
  2: "Especial",
  3: "Camporee",
};

export type ActivityType = {
  activity_type_id: number;
  name: string;
  description?: string | null;
};

export type Activity = {
  activity_id: number;
  name: string;
  description?: string | null;
  club_id: number;
  club_type_id: number;
  club_section_id: number;
  lat: number;
  long: number;
  activity_time?: string | null;
  activity_place: string;
  image?: string | null;
  platform?: number | null;
  activity_type_id: number;
  activity_type?: ActivityType | null;
  link_meet?: string | null;
  additional_data?: string | null;
  classes?: number[];
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ActivityListQuery = {
  page?: number;
  limit?: number;
  activityTypeId?: number;
  active?: boolean;
  clubTypeId?: number;
};

export type ActivityListResponse = {
  data: Activity[];
  total?: number;
  page?: number;
  limit?: number;
};

export type CreateActivityPayload = {
  name: string;
  description?: string;
  club_type_id: number;
  lat: number;
  long: number;
  activity_time?: string;
  activity_place: string;
  image: string;
  platform?: number;
  activity_type_id: number;
  link_meet?: string;
  additional_data?: string;
  classes?: number[];
  club_section_id: number;
};

export type UpdateActivityPayload = {
  name?: string;
  description?: string;
  lat?: number;
  long?: number;
  activity_time?: string;
  activity_place?: string;
  image?: string;
  platform?: number;
  activity_type_id?: number;
  link_meet?: string;
  active?: boolean;
  classes?: number[];
};

export type AttendanceRecord = {
  attendance_id?: number;
  activity_id: number;
  user_id: string;
  attended_at?: string | null;
  user?: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    photo?: string | null;
  } | null;
};

export type RegisterAttendancePayload = {
  user_ids: string[];
};

// ─── Server-side API functions (use apiRequest — reads cookie server-side) ────

export async function listActivities(
  clubId: number,
  query: ActivityListQuery = {},
): Promise<unknown> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (query.page) params.page = query.page;
  if (query.limit) params.limit = query.limit;
  if (query.activityTypeId) params.activityTypeId = query.activityTypeId;
  if (typeof query.active === "boolean") params.active = query.active;
  if (query.clubTypeId) params.clubTypeId = query.clubTypeId;

  return apiRequest(`/clubs/${clubId}/activities`, { params });
}

export async function getActivity(activityId: number): Promise<unknown> {
  return apiRequest(`/activities/${activityId}`);
}

export async function getAttendance(activityId: number): Promise<unknown> {
  return apiRequest(`/activities/${activityId}/attendance`);
}

// ─── Client-side API functions (use apiRequestFromClient — uses withCredentials axios) ─

export async function createActivity(
  clubId: number,
  data: CreateActivityPayload,
): Promise<unknown> {
  return apiRequestFromClient(`/clubs/${clubId}/activities`, {
    method: "POST",
    body: data,
  });
}

export async function updateActivity(
  activityId: number,
  data: UpdateActivityPayload,
): Promise<unknown> {
  return apiRequestFromClient(`/activities/${activityId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteActivity(activityId: number): Promise<unknown> {
  return apiRequestFromClient(`/activities/${activityId}`, {
    method: "DELETE",
  });
}

export async function registerAttendance(
  activityId: number,
  data: RegisterAttendancePayload,
): Promise<unknown> {
  return apiRequestFromClient(`/activities/${activityId}/attendance`, {
    method: "POST",
    body: data,
  });
}
