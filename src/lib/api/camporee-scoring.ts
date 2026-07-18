import { apiRequest } from "@/lib/api/client";

type ApiEnvelope<T> = { status: string; data: T };

function unwrapApiList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as ApiEnvelope<unknown>).data;
    if (Array.isArray(data)) {
      return data as T[];
    }
  }

  return [];
}

function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiEnvelope<T>).data;
  }

  return payload as T;
}

export type CamporeeJudgeRole = "primary" | "assistant";
export type CamporeeScoreSource = "manual_lf" | "admin_override" | "judge_primary";
export type CamporeeJudgeEligibilityReason =
  | "adult"
  | "pastor_role"
  | "invested_master_guide";

export interface CamporeeTemplateRubricInput {
  title: string;
  description?: string | null;
  max_points: number;
  display_order?: number;
}

export interface CamporeeEventTemplateRubric {
  camporee_event_template_rubric_id: number;
  event_template_id: number;
  title: string;
  description: string | null;
  max_points: number;
  display_order: number;
  active: boolean;
}

export interface CamporeeEventRubric {
  camporee_event_rubric_id: number;
  camporee_event_id: number;
  title: string;
  description: string | null;
  max_points: number;
  display_order: number;
  active: boolean;
}

export interface ReplaceCamporeeEventRubricsPayload {
  scoring_enabled: boolean;
  items: CamporeeTemplateRubricInput[];
}

export interface CamporeeJudge {
  camporee_judge_id: string;
  user_id: string;
  name: string | null;
  status: string;
  active: boolean;
}

export interface CamporeeJudgeCandidate {
  user_id: string;
  email: string | null;
  name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  full_name: string;
  user_image: string | null;
  active: boolean;
  access_app: boolean;
  access_panel: boolean;
  roles: string[];
  union?: { union_id: number | null; name: string | null } | null;
  local_field?: {
    local_field_id: number | null;
    union_id: number | null;
    name: string | null;
  } | null;
  camporee_judge_eligible: boolean;
  camporee_judge_eligibility_reasons: CamporeeJudgeEligibilityReason[];
}

export interface AddCamporeeJudgePayload {
  user_id: string;
  notes?: string | null;
}

export interface CamporeeEventJudgeAssignment {
  camporee_event_judge_assignment_id: string;
  camporee_event_id: number;
  camporee_judge_id: string;
  camporee_club_id: number | null;
  club_section_id: number;
  judge_role: CamporeeJudgeRole;
  active: boolean;
}

export interface AssignCamporeeEventJudgePayload {
  camporee_judge_id: string;
  camporee_club_id?: number | null;
  club_section_id: number;
  judge_role: CamporeeJudgeRole;
}

export interface UpdateCamporeeEventJudgeAssignmentPayload {
  judge_role?: CamporeeJudgeRole;
  active?: boolean;
}

export interface CamporeeEventScoreInput {
  source: "manual_lf" | "admin_override";
  notes?: string;
  items: Array<{
    camporee_event_rubric_id: number;
    awarded_points: number;
    notes?: string;
  }>;
}

export interface CamporeeScoringTarget {
  camporee_club_id: number;
  club_section_id: number;
  club_name: string | null;
  section_name: string | null;
  status: string;
}

export interface CamporeeLeaderboardRow {
  rank: number;
  camporee_club_id: number | null;
  club_section_id: number;
  club_name: string | null;
  section_name: string | null;
  total_awarded_points: number;
  total_max_points: number;
  percentage: number;
}

export interface CamporeeLeaderboard {
  scope: { type: "local" | "union"; camporeeId: number };
  rows: CamporeeLeaderboardRow[];
}

export async function getCamporeeEventRubrics(eventId: number) {
  return apiRequest<CamporeeEventRubric[]>(`/camporee-events/${eventId}/rubrics`);
}

export async function replaceCamporeeEventRubrics(
  eventId: number,
  payload: ReplaceCamporeeEventRubricsPayload,
) {
  return apiRequest<CamporeeEventRubric[]>(`/camporee-events/${eventId}/rubrics`, {
    method: "PUT",
    body: payload,
  });
}

export async function listLocalCamporeeJudges(camporeeId: number) {
  const res = await apiRequest<unknown>(`/local-camporees/${camporeeId}/judges`);
  return unwrapApiList<CamporeeJudge>(res);
}

export async function listLocalCamporeeJudgeCandidates(camporeeId: number) {
  const res = await apiRequest<unknown>(
    `/local-camporees/${camporeeId}/judge-candidates`,
  );
  return unwrapApiList<CamporeeJudgeCandidate>(res);
}

export async function addLocalCamporeeJudge(
  camporeeId: number,
  payload: AddCamporeeJudgePayload,
) {
  const res = await apiRequest<unknown>(`/local-camporees/${camporeeId}/judges`, {
    method: "POST",
    body: payload,
  });
  return unwrapApiData<CamporeeJudge>(res);
}

export async function listUnionCamporeeJudges(camporeeId: number) {
  const res = await apiRequest<unknown>(`/union-camporees/${camporeeId}/judges`);
  return unwrapApiList<CamporeeJudge>(res);
}

export async function listUnionCamporeeJudgeCandidates(camporeeId: number) {
  const res = await apiRequest<unknown>(
    `/union-camporees/${camporeeId}/judge-candidates`,
  );
  return unwrapApiList<CamporeeJudgeCandidate>(res);
}

export async function addUnionCamporeeJudge(
  camporeeId: number,
  payload: AddCamporeeJudgePayload,
) {
  const res = await apiRequest<unknown>(`/union-camporees/${camporeeId}/judges`, {
    method: "POST",
    body: payload,
  });
  return unwrapApiData<CamporeeJudge>(res);
}

export async function listCamporeeEventJudgeAssignments(eventId: number) {
  const res = await apiRequest<unknown>(
    `/camporee-events/${eventId}/judge-assignments`,
  );
  return unwrapApiList<CamporeeEventJudgeAssignment>(res);
}

export async function assignCamporeeEventJudge(
  eventId: number,
  payload: AssignCamporeeEventJudgePayload,
) {
  return apiRequest<CamporeeEventJudgeAssignment>(
    `/camporee-events/${eventId}/judge-assignments`,
    { method: "POST", body: payload },
  );
}

export async function updateCamporeeEventJudgeAssignment(
  assignmentId: string,
  payload: UpdateCamporeeEventJudgeAssignmentPayload,
) {
  return apiRequest<CamporeeEventJudgeAssignment>(
    `/camporee-event-judge-assignments/${assignmentId}`,
    { method: "PATCH", body: payload },
  );
}

export async function deleteCamporeeEventJudgeAssignment(assignmentId: string) {
  return apiRequest(`/camporee-event-judge-assignments/${assignmentId}`, {
    method: "DELETE",
  });
}

export async function listCamporeeEventScoringTargets(eventId: number) {
  return apiRequest<CamporeeScoringTarget[]>(
    `/camporee-events/${eventId}/scoring-targets`,
  );
}

export async function submitCamporeeEventScore(
  eventId: number,
  clubSectionId: number,
  payload: CamporeeEventScoreInput,
) {
  return apiRequest(
    `/camporee-events/${eventId}/sections/${clubSectionId}/scores`,
    { method: "POST", body: payload },
  );
}

export async function getLocalCamporeeLeaderboard(camporeeId: number) {
  return apiRequest<CamporeeLeaderboard>(`/local-camporees/${camporeeId}/leaderboard`);
}

export async function getUnionCamporeeLeaderboard(camporeeId: number) {
  return apiRequest<CamporeeLeaderboard>(`/union-camporees/${camporeeId}/leaderboard`);
}

export async function listMyCamporeeJudgeAssignments() {
  const res = await apiRequest<unknown>("/camporee-judges/me/assignments");
  return unwrapApiList<CamporeeEventJudgeAssignment>(res);
}
