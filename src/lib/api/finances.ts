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

export type FinanceEvidence = {
  evidence_id: number;
  finance_id: number;
  url: string;
  file_name: string;
  file_type: string;
  file_size?: number | null;
  uploaded_at?: string | null;
  active: boolean;
};

export const MAX_FINANCE_EVIDENCES = 3;
export const FINANCE_EVIDENCE_ACCEPT = "image/jpeg,image/png,image/webp";

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
  evidences?: FinanceEvidence[];
};

export type FinanceSummary = {
  club_id: number;
  period: string;
  total_income: number;
  total_expense: number;
  balance: number;
  movement_count: number;
  income_count?: number;
  expense_count?: number;
};

export type PaginatedFinances = {
  data: Finance[];
  total: number;
  page: number;
  limit: number;
};

export type FinanceSortField = "date" | "amount" | "category";
export type FinanceSortOrder = "asc" | "desc";

export type FinanceFilters = {
  year?: number;
  month?: number;
  clubTypeId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
  sortBy?: FinanceSortField;
  sortOrder?: FinanceSortOrder;
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

type FinanceRecord = Record<string, unknown>;

function isIncomeCategoryType(type: unknown): boolean {
  return type === 0 || type === "0";
}

export function isFinanceIncome(finance: Finance): boolean {
  return isIncomeCategoryType(finance.finances_categories?.type);
}

function unwrapFinanceRecord(payload: unknown): FinanceRecord {
  if (!payload || typeof payload !== "object") {
    return {} as FinanceRecord;
  }

  const root = payload as FinanceRecord;
  if (root.finance_id != null || root.id != null) {
    return root;
  }

  if (root.data && typeof root.data === "object") {
    return root.data as FinanceRecord;
  }

  return root;
}

export function normalizeFinanceEvidence(raw: unknown): FinanceEvidence | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as FinanceRecord;
  const evidenceId = Number(
    row.evidence_id ?? row.finance_evidence_file_id ?? row.id ?? 0,
  );
  if (!Number.isFinite(evidenceId) || evidenceId <= 0) return null;

  return {
    evidence_id: evidenceId,
    finance_id: Number(row.finance_id ?? 0),
    url: String(row.url ?? row.file_url ?? ""),
    file_name: String(row.file_name ?? ""),
    file_type: String(row.file_type ?? "image/jpeg"),
    file_size:
      row.file_size == null ? null : Number(row.file_size),
    uploaded_at:
      typeof row.uploaded_at === "string" ? row.uploaded_at : null,
    active: row.active !== false,
  };
}

function normalizeFinanceCategory(
  raw: unknown,
  financeCategoryId: number,
): Finance["finances_categories"] {
  if (!raw || typeof raw !== "object") return null;
  const category = raw as FinanceRecord;
  const typeRaw = category.type;
  const type =
    typeRaw === 0 || typeRaw === 1
      ? (typeRaw as FinanceCategoryType)
      : typeRaw === "0"
        ? 0
        : 1;

  return {
    name: String(category.name ?? ""),
    type,
  };
}

export function normalizeFinance(raw: FinanceRecord): Finance | null {
  const financeId = Number(raw.finance_id ?? raw.id ?? 0);
  if (!Number.isFinite(financeId) || financeId <= 0) return null;

  const categorySource =
    raw.finances_categories ?? raw.finance_category ?? raw.category;

  const evidences = Array.isArray(raw.evidences)
    ? raw.evidences
        .map((item) => normalizeFinanceEvidence(item))
        .filter((item): item is FinanceEvidence => item !== null)
    : [];

  return {
    finance_id: financeId,
    year: Number(raw.year ?? 0),
    month: Number(raw.month ?? 0),
    amount: Number(raw.amount ?? 0),
    description:
      typeof raw.description === "string" ? raw.description : null,
    club_type_id: Number(raw.club_type_id ?? 0),
    finance_category_id: Number(
      raw.finance_category_id ?? (categorySource as FinanceRecord | null)?.finance_category_id ?? (categorySource as FinanceRecord | null)?.id ?? 0,
    ),
    finance_date: String(raw.finance_date ?? raw.date ?? ""),
    club_section_id: Number(raw.club_section_id ?? 0),
    created_by:
      typeof raw.created_by === "string" ? raw.created_by : null,
    active: raw.active !== false,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    modified_at: typeof raw.modified_at === "string" ? raw.modified_at : null,
    finances_categories: normalizeFinanceCategory(
      categorySource,
      Number(raw.finance_category_id ?? 0),
    ),
    club_types:
      raw.club_types && typeof raw.club_types === "object"
        ? { name: String((raw.club_types as FinanceRecord).name ?? "") }
        : null,
    users:
      raw.users && typeof raw.users === "object"
        ? {
            name:
              typeof (raw.users as FinanceRecord).name === "string"
                ? ((raw.users as FinanceRecord).name as string)
                : null,
            paternal_last_name:
              typeof (raw.users as FinanceRecord).paternal_last_name === "string"
                ? ((raw.users as FinanceRecord).paternal_last_name as string)
                : null,
          }
        : null,
    evidences,
  };
}

function normalizeFinanceSummary(
  payload: unknown,
  clubId: number,
): FinanceSummary {
  const root =
    payload && typeof payload === "object"
      ? (payload as FinanceRecord)
      : ({} as FinanceRecord);

  const nestedData =
    root.data && typeof root.data === "object"
      ? (root.data as FinanceRecord)
      : null;
  const nestedSummary =
    nestedData?.summary && typeof nestedData.summary === "object"
      ? (nestedData.summary as FinanceRecord)
      : root.summary && typeof root.summary === "object"
        ? (root.summary as FinanceRecord)
        : null;

  const data =
    root.total_income !== undefined
      ? root
      : nestedSummary ??
        (nestedData?.total_income !== undefined ? nestedData : null) ??
        nestedData ??
        root;

  return {
    club_id: Number(data.club_id ?? clubId),
    period: String(data.period ?? "all"),
    total_income: Number(data.total_income ?? 0),
    total_expense: Number(data.total_expense ?? 0),
    balance: Number(data.balance ?? 0),
    movement_count: Number(data.movement_count ?? 0),
  };
}

function normalizePaginatedFinances(payload: unknown): PaginatedFinances {
  const root =
    payload && typeof payload === "object"
      ? (payload as FinanceRecord)
      : ({} as FinanceRecord);

  const rows = Array.isArray(root.data) ? root.data : [];
  const meta =
    root.meta && typeof root.meta === "object"
      ? (root.meta as FinanceRecord)
      : null;

  const data = rows
    .map((row) =>
      row && typeof row === "object"
        ? normalizeFinance(row as FinanceRecord)
        : null,
    )
    .filter((row): row is Finance => row !== null);

  return {
    data,
    total: Number(meta?.total ?? root.total ?? data.length),
    page: Number(meta?.page ?? root.page ?? 1),
    limit: Number(meta?.limit ?? root.limit ?? data.length),
  };
}

export function summarizeFinances(
  items: Finance[],
  clubId: number,
  period = "all",
): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const item of items) {
    if (isIncomeCategoryType(item.finances_categories?.type)) {
      totalIncome += item.amount;
      incomeCount += 1;
    } else {
      totalExpense += item.amount;
      expenseCount += 1;
    }
  }

  return {
    club_id: clubId,
    period,
    total_income: totalIncome,
    total_expense: totalExpense,
    balance: totalIncome - totalExpense,
    movement_count: items.length,
    income_count: incomeCount,
    expense_count: expenseCount,
  };
}

export function mergeFinanceSummaryForDisplay(
  apiSummary: FinanceSummary | null,
  transactions: Finance[],
  totalCount: number,
  clubId: number,
  month?: number,
): FinanceSummary | null {
  if (!apiSummary && transactions.length === 0) {
    return null;
  }

  const hasFullList =
    totalCount > 0 && transactions.length >= totalCount;
  const clientSummary =
    transactions.length > 0
      ? summarizeFinances(
          transactions,
          clubId,
          apiSummary?.period ?? "all",
        )
      : null;

  if (!apiSummary) {
    return clientSummary;
  }

  if (!clientSummary || !hasFullList) {
    return apiSummary;
  }

  if (month !== undefined) {
    return {
      ...apiSummary,
      total_income: clientSummary.total_income,
      total_expense: clientSummary.total_expense,
      movement_count: clientSummary.movement_count,
      income_count: clientSummary.income_count,
      expense_count: clientSummary.expense_count,
    };
  }

  return clientSummary;
}

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
  const params: Record<string, string | number | undefined> = {};
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  if (filters.clubTypeId) params.clubTypeId = filters.clubTypeId;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortOrder) params.sortOrder = filters.sortOrder;

  const payload = await apiRequest<unknown>(`/clubs/${clubId}/finances`, {
    params,
  });
  return normalizePaginatedFinances(payload);
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

  const payload = await apiRequest<unknown>(
    `/clubs/${clubId}/finances/summary`,
    { params },
  );
  return normalizeFinanceSummary(payload, clubId);
}

/**
 * GET /api/v1/finances/:financeId
 */
export async function getFinance(financeId: number): Promise<Finance> {
  const payload = await apiRequest<unknown>(`/finances/${financeId}`);
  const finance = normalizeFinance(unwrapFinanceRecord(payload));
  if (!finance) {
    throw new Error("Finance not found");
  }
  return finance;
}

/**
 * POST /api/v1/clubs/:clubId/finances
 * Client-side only (mutation)
 */
export async function createFinance(
  clubId: number,
  payload: CreateFinancePayload,
): Promise<Finance> {
  const response = await apiRequestFromClient<unknown>(
    `/clubs/${clubId}/finances`,
    {
      method: "POST",
      body: payload,
    },
  );
  const finance = normalizeFinance(unwrapFinanceRecord(response));
  if (!finance) {
    throw new Error("Invalid finance response");
  }
  return finance;
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

/**
 * POST /api/v1/finances/:financeId/evidences
 * Client-side only (multipart upload)
 */
export async function uploadFinanceEvidence(
  financeId: number,
  file: File,
): Promise<FinanceEvidence> {
  const formData = new FormData();
  formData.append("file", file);

  const payload = await apiRequestFromClient<unknown>(
    `/finances/${financeId}/evidences`,
    {
      method: "POST",
      body: formData,
    },
  );

  const evidence =
    normalizeFinanceEvidence(payload) ??
    normalizeFinanceEvidence(
      payload && typeof payload === "object"
        ? (payload as FinanceRecord).data
        : null,
    );
  if (!evidence) {
    throw new Error("Invalid evidence response");
  }
  return evidence;
}
