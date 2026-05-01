import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/** 0 = ingreso, 1 = egreso */
export type FinanceCategoryType = 0 | 1;

export type FinanceCategory = {
  finance_category_id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  type: FinanceCategoryType;
};

export type FinanceUser = {
  name?: string | null;
  paternal_last_name?: string | null;
};

export type Finance = {
  finance_id: number;
  year: number;
  month: number;
  amount: number;
  description?: string | null;
  club_type_id: number;
  finance_category_id: number;
  finance_date: string;
  club_section_id: number;
  created_by?: string | null;
  active: boolean;
  created_at?: string | null;
  modified_at?: string | null;
  finances_categories?: {
    name: string;
    type: FinanceCategoryType;
  } | null;
  club_types?: {
    name: string;
  } | null;
  users?: FinanceUser | null;
};

export type FinanceSummary = {
  club_id: number;
  period: string;
  total_income: number;
  total_expense: number;
  balance: number;
  movement_count: number;
};

export type PaginatedFinances = {
  data: Finance[];
  total: number;
  page: number;
  limit: number;
};

export type FinanceFilters = {
  year?: number;
  month?: number;
  clubTypeId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
};

export type CreateFinancePayload = {
  year: number;
  month: number;
  amount: number;
  description?: string;
  club_type_id: number;
  finance_category_id: number;
  finance_date: string;
  club_section_id: number;
};

export type UpdateFinancePayload = {
  amount?: number;
  description?: string;
  finance_category_id?: number;
  finance_date?: string;
};

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/finances/categories
 * @param type — 0=ingresos, 1=egresos (omit for all)
 */
export async function getFinanceCategories(
  type?: FinanceCategoryType,
): Promise<FinanceCategory[]> {
  const params: Record<string, number | undefined> = {};
  if (type !== undefined) params.type = type;
  return apiRequest<FinanceCategory[]>("/finances/categories", { params });
}

/**
 * GET /api/v1/clubs/:clubId/finances
 */
export async function listFinances(
  clubId: number,
  filters: FinanceFilters = {},
): Promise<PaginatedFinances> {
  const params: Record<string, number | undefined> = {};
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  if (filters.clubTypeId) params.clubTypeId = filters.clubTypeId;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  return apiRequest<PaginatedFinances>(`/clubs/${clubId}/finances`, { params });
}

/**
 * GET /api/v1/clubs/:clubId/finances/summary
 */
export async function getFinanceSummary(
  clubId: number,
  year?: number,
  month?: number,
): Promise<FinanceSummary> {
  const params: Record<string, number | undefined> = {};
  if (year) params.year = year;
  if (month) params.month = month;

  return apiRequest<FinanceSummary>(`/clubs/${clubId}/finances/summary`, { params });
}

/**
 * GET /api/v1/finances/:financeId
 */
export async function getFinance(financeId: number): Promise<Finance> {
  return apiRequest<Finance>(`/finances/${financeId}`);
}

/**
 * POST /api/v1/clubs/:clubId/finances
 * Client-side only (mutation)
 */
export async function createFinance(
  clubId: number,
  payload: CreateFinancePayload,
): Promise<Finance> {
  return apiRequestFromClient<Finance>(`/clubs/${clubId}/finances`, {
    method: "POST",
    body: payload,
  });
}

/**
 * PATCH /api/v1/finances/:financeId
 * Client-side only (mutation)
 */
export async function updateFinance(
  financeId: number,
  payload: UpdateFinancePayload,
): Promise<Finance> {
  return apiRequestFromClient<Finance>(`/finances/${financeId}`, {
    method: "PATCH",
    body: payload,
  });
}

/**
 * DELETE /api/v1/finances/:financeId (soft delete)
 * Client-side only (mutation)
 */
export async function deleteFinance(financeId: number): Promise<unknown> {
  return apiRequestFromClient<unknown>(`/finances/${financeId}`, {
    method: "DELETE",
  });
}
