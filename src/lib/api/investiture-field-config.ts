import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type InvestitureWindow = {
  local_field_id: number;
  ecclesiastical_year_id: number;
  start_date: string | null;
  end_date: string | null;
  configured: boolean;
  operational: boolean;
  can_edit: boolean;
};

export type FieldClassThreshold = {
  local_field_id: number;
  ecclesiastical_year_id: number;
  minimum_percent: number;
  configured: boolean;
  can_edit: boolean;
};

export type PastorQuota = { slots: number; configured: boolean; can_edit: boolean };

export type DistrictPastor = {
  districlub_type_id: number;
  user_id: string;
  user_name?: string | null;
  email?: string | null;
  can_authorize: boolean;
  role_missing?: boolean;
  account_inactive?: boolean;
};

export type DistrictPastorList = {
  districlub_type_id: number;
  slots: number;
  can_assign: boolean;
  pastors: DistrictPastor[];
};

export type PastorCandidate = {
  user_id: string;
  user_name: string | null;
  email: string | null;
};

const windowPath = (localFieldId: number, yearId: number) =>
  `/local-fields/${localFieldId}/investiture-windows/${yearId}`;
const thresholdPath = (localFieldId: number, yearId: number) =>
  `/local-fields/${localFieldId}/class-thresholds/${yearId}`;
const pastorsPath = (districtId: number) => `/districts/${districtId}/investiture-pastors`;

// GET /local-fields/:lf/investiture-windows/:year
export async function getInvestitureWindow(localFieldId: number, yearId: number): Promise<InvestitureWindow> {
  const raw = await apiRequest<unknown>(windowPath(localFieldId, yearId));
  return unwrapApiData<InvestitureWindow>(raw);
}

// PATCH /local-fields/:lf/investiture-windows/:year  body { start_date, end_date }
export async function updateInvestitureWindow(
  localFieldId: number,
  yearId: number,
  body: { start_date: string; end_date: string },
): Promise<InvestitureWindow> {
  const raw = await apiRequestFromClient<unknown>(windowPath(localFieldId, yearId), {
    method: "PATCH",
    body,
  });
  return unwrapApiData<InvestitureWindow>(raw);
}

// GET /local-fields/:lf/class-thresholds/:year
export async function getFieldClassThreshold(localFieldId: number, yearId: number): Promise<FieldClassThreshold> {
  const raw = await apiRequest<unknown>(thresholdPath(localFieldId, yearId));
  return unwrapApiData<FieldClassThreshold>(raw);
}

// PATCH /local-fields/:lf/class-thresholds/:year  body { minimum_percent }
export async function updateFieldClassThreshold(
  localFieldId: number,
  yearId: number,
  minimumPercent: number,
): Promise<FieldClassThreshold> {
  const raw = await apiRequestFromClient<unknown>(thresholdPath(localFieldId, yearId), {
    method: "PATCH",
    body: { minimum_percent: minimumPercent },
  });
  return unwrapApiData<FieldClassThreshold>(raw);
}

// GET /investiture-pastor-quota
export async function getPastorQuota(): Promise<PastorQuota> {
  const raw = await apiRequest<unknown>("/investiture-pastor-quota");
  return unwrapApiData<PastorQuota>(raw);
}

// PATCH /investiture-pastor-quota  body { slots }
export async function updatePastorQuota(slots: number): Promise<PastorQuota> {
  const raw = await apiRequestFromClient<unknown>("/investiture-pastor-quota", {
    method: "PATCH",
    body: { slots },
  });
  return unwrapApiData<PastorQuota>(raw);
}

// GET /districts/:d/investiture-pastors
export async function listDistrictPastors(districtId: number): Promise<DistrictPastorList> {
  const raw = await apiRequest<unknown>(pastorsPath(districtId));
  return unwrapApiData<DistrictPastorList>(raw);
}

// POST /districts/:d/investiture-pastors  body { user_id }
// Backend returns the assigned pastor (not the whole list).
export async function assignDistrictPastor(districtId: number, userId: string): Promise<DistrictPastor> {
  const raw = await apiRequestFromClient<unknown>(pastorsPath(districtId), {
    method: "POST",
    body: { user_id: userId },
  });
  return unwrapApiData<DistrictPastor>(raw);
}

// DELETE /districts/:d/investiture-pastors/:userId
// Backend returns the unassigned pastor view (can_authorize: false).
export async function removeDistrictPastor(districtId: number, userId: string): Promise<DistrictPastor> {
  const raw = await apiRequestFromClient<unknown>(
    `${pastorsPath(districtId)}/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
  return unwrapApiData<DistrictPastor>(raw);
}

// GET /investiture-pastor-candidates?q=&districtId=  (min 3 chars; the backend returns [] below that)
// `districtId` scopes the result to the Field of the district being edited: assign only accepts
// pastors of that Field.
export async function searchPastorCandidates(
  q: string,
  districtId: number,
): Promise<PastorCandidate[]> {
  const raw = await apiRequestFromClient<unknown>("/investiture-pastor-candidates", {
    params: { q, districtId },
  });
  return unwrapApiData<PastorCandidate[]>(raw);
}
