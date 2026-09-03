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
  club_name?: string | null;
  club_type_id: number;
  club_section_id: number;
  lat: number;
  long: number;
  activity_date?: string | null;
  activity_end_date?: string | null;
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
  activity_series_id?: number | null;
};

export type ActivityListQuery = {
  page?: number;
  limit?: number;
  activityTypeId?: number;
  active?: boolean;
  clubTypeId?: number;
  seriesId?: number;
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
  activity_date?: string;
  activity_end_date?: string;
  activity_place: string;
  image: string;
  platform?: number;
  activity_type_id: number;
  link_meet?: string;
  additional_data?: string;
  classes?: number[];
  club_section_id: number;
};

export type RecurrencePayload = {
  kind: "interval" | "weekly";
  interval_days?: number;
  weekdays?: number[];
  until?: string;
};

export type CreateActivitySeriesPayload = Omit<CreateActivityPayload, "image"> & {
  image?: string;
  recurrence: RecurrencePayload;
  activity_date: string;
};

export type ActivitySeriesPreview = {
  count: number;
  dates: string[];
  until: string;
  ecclesiastical_year: {
    year_id: number;
    start_date?: string;
    end_date?: string;
  };
};

export type ActivitySeriesSummary = {
  activity_series_id: number;
  club_id: number;
  ecclesiastical_year_id: number;
  name: string;
  first_date?: string;
  until_date: string;
  kind: string;
  interval_days?: number | null;
  weekdays?: number[];
  counts?: {
    total: number;
    active: number;
    upcoming: number;
    past: number;
  };
};

function unwrapApiObject<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as { data: unknown }).data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return data as T;
    }
  }
  return payload as T;
}

function toDateOnly(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  return value.slice(0, 10);
}

export type UpdateActivityPayload = {
  name?: string;
  description?: string;
  lat?: number;
  long?: number;
  activity_time?: string;
  activity_date?: string;
  activity_end_date?: string;
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
  if (query.seriesId) params.seriesId = query.seriesId;

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

export async function previewActivitySeries(
  clubId: number,
  data: CreateActivitySeriesPayload,
): Promise<ActivitySeriesPreview> {
  const payload = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/activity-series/preview`,
    { method: "POST", body: data },
  );
  return unwrapApiObject<ActivitySeriesPreview>(payload);
}

export async function createActivitySeries(
  clubId: number,
  data: CreateActivitySeriesPayload,
): Promise<{ created_count: number; activity_ids?: number[] }> {
  const payload = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/activity-series`,
    { method: "POST", body: data },
  );
  return unwrapApiObject(payload);
}

export async function getActivitySeries(
  seriesId: number,
): Promise<ActivitySeriesSummary> {
  const payload = await apiRequestFromClient<unknown>(
    `/activity-series/${seriesId}`,
  );
  return unwrapApiObject<ActivitySeriesSummary>(payload);
}

export async function cancelFutureActivitySeries(
  seriesId: number,
): Promise<{ canceled_count: number }> {
  const payload = await apiRequestFromClient<unknown>(
    `/activity-series/${seriesId}/cancel-future`,
    { method: "POST", body: {} },
  );
  return unwrapApiObject(payload);
}

export async function extendActivitySeries(
  seriesId: number,
  until: string,
): Promise<{ created_count: number; activity_ids: number[] }> {
  const payload = await apiRequestFromClient<unknown>(
    `/activity-series/${seriesId}/extend`,
    { method: "POST", body: { until } },
  );
  return unwrapApiObject(payload);
}

export async function getCurrentEcclesiasticalYearFromClient(): Promise<{
  year_id: number;
  start_date?: string;
  end_date?: string;
}> {
  const payload = await apiRequestFromClient<unknown>(
    "/catalogs/ecclesiastical-years/current",
  );
  const year = unwrapApiObject<{
    year_id?: number;
    ecclesiastical_year_id?: number;
    start_date?: string | Date;
    end_date?: string | Date;
  }>(payload);
  return {
    year_id: Number(year.year_id ?? year.ecclesiastical_year_id ?? 0),
    start_date: toDateOnly(year.start_date),
    end_date: toDateOnly(year.end_date),
  };
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
