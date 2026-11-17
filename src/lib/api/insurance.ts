import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsuranceType =
  | "GENERAL_ACTIVITIES"
  | "CAMPOREE"
  | "HIGH_RISK";

export type InsuranceRecord = {
  insurance_id: number;
  insurance_type: InsuranceType | null;
  policy_number: string | null;
  provider: string | null;
  start_date: string | null;
  end_date: string | null;
  coverage_amount: number | null;
  active: boolean | null;
  evidence_file_url: string | null;
  evidence_file_name: string | null;
  created_at: string | null;
  modified_at: string | null;
  created_by_name: string | null;
  modified_by_name: string | null;
};

// ─── Section overview (annual model) ──────────────────────────────────────────

export type InsurancePersonStatus =
  | "covered"
  | "in_order"
  | "in_review"
  | "proof_rejected"
  | "uninsured";

export type InsuranceCoverageSource =
  | "paid_here"
  | "paid_elsewhere"
  | "reassigned";

export type InsuranceOverviewCoverage = {
  source: InsuranceCoverageSource;
  paid_in_section_name: string | null;
  paid_in_club_name: string | null;
  order_folio: string | null;
  approved_at: string | null;
  valid_until: string | null;
  reassigned_from_name: string | null;
  reassigned_by_name: string | null;
  reassigned_at: string | null;
};

export type InsuranceOverviewActiveOrder = {
  order_id: number;
  folio: string;
  status: string;
  expires_at: string | null;
};

export type InsuranceOverviewPerson = {
  user_id: string;
  name: string | null;
  picture: string | null;
  role_label: string | null;
  is_staff: boolean;
  status: InsurancePersonStatus;
  coverage: InsuranceOverviewCoverage | null;
  active_order: InsuranceOverviewActiveOrder | null;
};

export type SectionInsuranceOverview = {
  year: {
    ecclesiastical_year_id: number;
    label: string;
    start_date: string;
    end_date: string;
  } | null;
  cycle: {
    insurance_cycle_config_id: number;
    unit_cost: string | number;
    purchase_deadline: string;
    currency: string;
  } | null;
  counts: {
    total: number;
    covered: number;
    in_process: number;
    uninsured: number;
  };
  free_coverages_count: number;
  people: InsuranceOverviewPerson[];
};

function normalizeOverview(payload: unknown): SectionInsuranceOverview | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown };
  const data = (
    root.data && typeof root.data === "object" ? root.data : payload
  ) as SectionInsuranceOverview;
  return {
    ...data,
    people: Array.isArray(data.people) ? data.people : [],
    counts: data.counts ?? { total: 0, covered: 0, in_process: 0, uninsured: 0 },
    free_coverages_count: data.free_coverages_count ?? 0,
  };
}

/** Server-side: GET club-sections/:sectionId/insurance/overview */
export async function getSectionInsuranceOverview(
  sectionId: number,
): Promise<SectionInsuranceOverview | null> {
  const payload = await apiRequest<unknown>(
    `/club-sections/${sectionId}/insurance/overview`,
  );
  return normalizeOverview(payload);
}

/** Client-side variant of {@link getSectionInsuranceOverview}. */
export async function getSectionInsuranceOverviewFromClient(
  sectionId: number,
): Promise<SectionInsuranceOverview | null> {
  const payload = await apiRequestFromClient<unknown>(
    `/club-sections/${sectionId}/insurance/overview`,
  );
  return normalizeOverview(payload);
}

// ─── Member insurance record (camporee registration auto-fill) ────────────────

export async function getMemberInsuranceFromClient(
  memberId: string,
): Promise<InsuranceRecord | null> {
  const payload = await apiRequestFromClient<{
    status: string;
    data: InsuranceRecord | null;
  }>(`/users/${memberId}/insurance`);
  return payload?.data ?? null;
}
