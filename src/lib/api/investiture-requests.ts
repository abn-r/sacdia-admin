import { apiRequest, apiRequestFromClient } from "@/lib/api/client";
import { unwrapApiData } from "@/lib/api/unwrap";

export type InvestiturePersonStatus =
  | "PENDING"
  | "INVESTED"
  | "REJECTED_BY_PERSON"
  | "REJECTED_BY_SYSTEM"
  | "REMOVED"
  | "CLOSED_YEAR";

export type InvestitureRequestPerson = {
  person_id: string;
  user_id: string;
  user_name: string | null;
  class_id: number;
  class_name: string | null;
  section_name: string | null;
  enrollment_id: number;
  investiture_date: string;
  status: InvestiturePersonStatus;
  can_authorize: boolean;
  authorization_comment: string | null;
  rejection_reason: string | null;
  system_reason: string | null;
  resolution_code: string | null;
  resolved_by_id: string | null;
  resolved_by_name: string | null;
  date_changed_by_id: string | null;
  date_changed_at: string | null;
};

export type InvestitureRequest = {
  request_id: string;
  club_section_id: number;
  ecclesiastical_year_id: number;
  club_id?: number | null;
  club_name?: string | null;
  section_name?: string | null;
  district_name?: string | null;
  pending_count?: number;
  earliest_investiture_date?: string | null;
  created_at?: string;
  people: InvestitureRequestPerson[];
};

export type InvestitureResolutionInput = {
  invest?: Array<{ person_id: string; comment?: string }>;
  reject?: Array<{ person_id: string; reason: string }>;
};

export type InvestitureResolution = {
  request_id: string;
  invested: InvestitureRequestPerson[];
  rejected_by_person: InvestitureRequestPerson[];
  rejected_by_system: InvestitureRequestPerson[];
  retired: InvestitureRequestPerson[];
  blocked: Array<{ person_id: string; code: string }>;
  already_resolved: Array<{ person_id: string; status: InvestiturePersonStatus }>;
};

export async function listInvestitureRequestsForAuthorizer(
  ecclesiasticalYearId: number,
): Promise<InvestitureRequest[]> {
  const raw = await apiRequest<unknown>("/investiture-requests", {
    params: { ecclesiastical_year_id: ecclesiasticalYearId },
  });
  return unwrapApiData<InvestitureRequest[]>(raw);
}

export async function getInvestitureRequest(requestId: string): Promise<InvestitureRequest> {
  const raw = await apiRequest<unknown>(`/investiture-requests/${encodeURIComponent(requestId)}`);
  return unwrapApiData<InvestitureRequest>(raw);
}

export async function resolveInvestitureRequest(
  requestId: string,
  input: InvestitureResolutionInput,
): Promise<InvestitureResolution> {
  const raw = await apiRequestFromClient<unknown>(
    `/investiture-requests/${encodeURIComponent(requestId)}/resolutions`,
    { method: "POST", body: input },
  );
  return unwrapApiData<InvestitureResolution>(raw);
}
