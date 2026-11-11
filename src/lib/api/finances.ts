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
  /** True when the movement's month is closed (legacy rows without section count as closed). */
  period_closed: boolean;
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
  /** Income of the requested period only. */
  total_income: number;
  /** Expenses of the requested period only. */
  total_expense: number;
  /** total_income - total_expense of the period. */
  net: number;
  /** All-time cumulative balance up to the end of the period. */
  balance: number;
  movement_count: number;
  /** Ecclesiastical-year-to-date income through the selected month. */
  year_income: number;
  year_expenses: number;
  /** Only meaningful when a month was requested; null otherwise. */
  period_closed: boolean | null;
  income_count?: number;
  expense_count?: number;
};

export type FinanceCategoryBreakdownItem = {
  category_id: number;
  name: string;
  total: number;
  count: number;
};

export type FinanceByCategory = {
  club_id: number;
  club_section_id: number | null;
  period: string;
  income: FinanceCategoryBreakdownItem[];
  expenses: FinanceCategoryBreakdownItem[];
  totals: { income: number; expenses: number };
};

export type FinanceOverviewRow = {
  club_id: number;
  club_name: string;
  local_field: { local_field_id: number; name: string } | null;
  income: number;
  expenses: number;
  net: number;
  balance: number;
  movements: number;
  months_without_movements: number;
  missed_months: number[];
  last_movement_at: string | null;
};

export type FinanceOverview = {
  period: string;
  data: FinanceOverviewRow[];
  totals: {
    income: number;
    expenses: number;
    net: number;
    balance: number;
    movements: number;
  };
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type FinanceOverviewFilters = {
  localFieldId?: number;
  year?: number;
  month?: number;
  page?: number;
  limit?: number;
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
  clubSectionId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
};

/** Backend error codes of closed-month writes. */
export const FINANCE_CLOSED_PERIOD_NOTE_REQUIRED =
  "FINANCE_CLOSED_PERIOD_NOTE_REQUIRED";
export const FINANCE_PERIOD_CLOSED = "FINANCE_PERIOD_CLOSED";

export const POST_CLOSING_NOTE_MIN = 5;
export const POST_CLOSING_NOTE_MAX = 500;

/** Reads the backend `{ code }` of a failed request (ApiError.payload), if any. */
export function getFinanceErrorCode(error: unknown): string | null {
  const payload =
    error && typeof error === "object"
      ? (error as { payload?: unknown }).payload
      : null;
  if (payload && typeof payload === "object") {
    const code = (payload as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

export type CreateFinancePayload = {
  year: number;
  month: number;
  amount: number;
  description?: string;
  club_type_id: number;
  finance_category_id: number;
  finance_date: string;
  club_section_id: number;
  /** Required by the backend when the month is closed (5-500 chars). */
  post_closing_note?: string;
};

export type UpdateFinancePayload = {
  amount?: number;
  description?: string;
  finance_category_id?: number;
  finance_date?: string;
  /** Required by the backend when the month is closed (5-500 chars). */
  post_closing_note?: string;
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
  // `/transactions` rows carry `typeCode` (0/1) and the string type on the row itself.
  const typeRaw = category.type ?? category.typeCode;
  const type =
    typeRaw === 0 || typeRaw === 1
      ? (typeRaw as FinanceCategoryType)
      : typeRaw === "0" || typeRaw === "income"
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
    period_closed: raw.period_closed === true,
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

  const totalIncome = Number(data.total_income ?? 0);
  const totalExpense = Number(data.total_expense ?? 0);

  return {
    club_id: Number(data.club_id ?? clubId),
    period: String(data.period ?? "all"),
    total_income: totalIncome,
    total_expense: totalExpense,
    net: Number(data.net ?? totalIncome - totalExpense),
    balance: Number(data.balance ?? 0),
    movement_count: Number(data.movement_count ?? 0),
    year_income: Number(data.year_income ?? 0),
    year_expenses: Number(data.year_expenses ?? 0),
    period_closed:
      typeof data.period_closed === "boolean" ? data.period_closed : null,
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
 * GET /api/v1/clubs/:clubId/finances (paginated, max 100 per page).
 *
 * Used instead of `/finances/transactions` because only this endpoint returns
 * `club_section_id` per row and accepts `year` + `month` (the transactions one
 * filters by date range and omits the section).
 */
export async function listFinances(
  clubId: number,
  filters: FinanceFilters = {},
): Promise<PaginatedFinances> {
  const params: Record<string, string | number | undefined> = {};
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  if (filters.clubTypeId) params.clubTypeId = filters.clubTypeId;
  if (filters.clubSectionId) params.club_section_id = filters.clubSectionId;
  if (filters.categoryId) params.categoryId = filters.categoryId;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

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
  clubSectionId?: number,
): Promise<FinanceSummary> {
  const params: Record<string, number | undefined> = {};
  if (year) params.year = year;
  if (month) params.month = month;
  if (clubSectionId) params.club_section_id = clubSectionId;

  const payload = await apiRequest<unknown>(
    `/clubs/${clubId}/finances/summary`,
    { params },
  );
  return normalizeFinanceSummary(payload, clubId);
}

function normalizeBreakdown(raw: unknown): FinanceCategoryBreakdownItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is FinanceRecord => !!row && typeof row === "object")
    .map((row) => ({
      category_id: Number(row.category_id ?? 0),
      name: String(row.name ?? ""),
      total: Number(row.total ?? 0),
      count: Number(row.count ?? 0),
    }));
}

/**
 * GET /api/v1/clubs/:clubId/finances/by-category (year required)
 */
export async function getFinanceByCategory(
  clubId: number,
  year: number,
  month?: number,
  clubSectionId?: number,
): Promise<FinanceByCategory> {
  const params: Record<string, number | undefined> = { year };
  if (month) params.month = month;
  if (clubSectionId) params.club_section_id = clubSectionId;

  const payload = await apiRequest<unknown>(
    `/clubs/${clubId}/finances/by-category`,
    { params },
  );
  const root =
    payload && typeof payload === "object"
      ? (payload as FinanceRecord)
      : ({} as FinanceRecord);
  const data = (
    root.data && typeof root.data === "object" ? root.data : root
  ) as FinanceRecord;
  const totals = (
    data.totals && typeof data.totals === "object" ? data.totals : {}
  ) as FinanceRecord;

  return {
    club_id: Number(data.club_id ?? clubId),
    club_section_id:
      data.club_section_id == null ? null : Number(data.club_section_id),
    period: String(data.period ?? ""),
    income: normalizeBreakdown(data.income),
    expenses: normalizeBreakdown(data.expenses),
    totals: {
      income: Number(totals.income ?? 0),
      expenses: Number(totals.expenses ?? 0),
    },
  };
}

/**
 * GET /api/v1/finances/overview (territorial / admin roles only; club roles get 403)
 */
export async function getFinanceOverview(
  filters: FinanceOverviewFilters = {},
): Promise<FinanceOverview> {
  const params: Record<string, number | undefined> = {};
  if (filters.localFieldId) params.local_field_id = filters.localFieldId;
  if (filters.year) params.year = filters.year;
  if (filters.month) params.month = filters.month;
  if (filters.page) params.page = filters.page;
  if (filters.limit) params.limit = filters.limit;

  const payload = await apiRequest<unknown>("/finances/overview", { params });
  const root =
    payload && typeof payload === "object"
      ? (payload as FinanceRecord)
      : ({} as FinanceRecord);
  const data = (
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? root.data
      : root
  ) as FinanceRecord;
  const totals = (
    data.totals && typeof data.totals === "object" ? data.totals : {}
  ) as FinanceRecord;
  const meta = (
    data.meta && typeof data.meta === "object" ? data.meta : {}
  ) as FinanceRecord;
  const rows = Array.isArray(data.data) ? data.data : [];

  const normalized: FinanceOverviewRow[] = rows
    .filter((row): row is FinanceRecord => !!row && typeof row === "object")
    .map((row) => {
      const lf =
        row.local_field && typeof row.local_field === "object"
          ? (row.local_field as FinanceRecord)
          : null;
      return {
        club_id: Number(row.club_id ?? 0),
        club_name: String(row.club_name ?? ""),
        local_field: lf
          ? {
              local_field_id: Number(lf.local_field_id ?? 0),
              name: String(lf.name ?? ""),
            }
          : null,
        income: Number(row.income ?? 0),
        expenses: Number(row.expenses ?? 0),
        net: Number(row.net ?? 0),
        balance: Number(row.balance ?? 0),
        movements: Number(row.movements ?? 0),
        months_without_movements: Number(row.months_without_movements ?? 0),
        missed_months: Array.isArray(row.missed_months)
          ? row.missed_months.map(Number).filter((m) => m >= 1 && m <= 12)
          : [],
        last_movement_at:
          typeof row.last_movement_at === "string"
            ? row.last_movement_at
            : null,
      };
    });

  return {
    period: String(data.period ?? ""),
    data: normalized,
    totals: {
      income: Number(totals.income ?? 0),
      expenses: Number(totals.expenses ?? 0),
      net: Number(totals.net ?? 0),
      balance: Number(totals.balance ?? 0),
      movements: Number(totals.movements ?? 0),
    },
    meta: {
      page: Number(meta.page ?? 1),
      limit: Number(meta.limit ?? normalized.length),
      total: Number(meta.total ?? normalized.length),
      totalPages: Number(meta.totalPages ?? 1),
    },
  };
}

export type FinanceExportFormat = "xlsx" | "pdf";

export type FinanceExportFilters = {
  clubId: number;
  /** Output format; defaults to xlsx. */
  format?: FinanceExportFormat;
  year: number;
  month?: number;
  clubSectionId?: number;
};

/** Same-origin URL of the export proxy (attaches the httpOnly-cookie token server-side). */
export function buildFinanceExportUrl(filters: FinanceExportFilters): string {
  const query = new URLSearchParams({
    clubId: String(filters.clubId),
    year: String(filters.year),
  });
  if (filters.month) query.set("month", String(filters.month));
  if (filters.clubSectionId) {
    query.set("club_section_id", String(filters.clubSectionId));
  }
  if (filters.format === "pdf") query.set("format", "pdf");
  return `/api/finances/export?${query.toString()}`;
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}

/**
 * Downloads the xlsx or pdf export keeping the server's filename.
 * Client-side only. Throws an Error carrying `status` on failure.
 */
export async function downloadFinanceExport(
  filters: FinanceExportFilters,
): Promise<string> {
  const response = await fetch(buildFinanceExportUrl(filters), {
    credentials: "include",
  });
  if (!response.ok) {
    const error = new Error(`Export failed with status ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const filename =
    filenameFromContentDisposition(response.headers.get("content-disposition")) ??
    `finanzas-${filters.clubId}-${filters.year}.${filters.format ?? "xlsx"}`;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
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
export async function deleteFinance(
  financeId: number,
  reason?: string,
): Promise<unknown> {
  return apiRequestFromClient<unknown>(`/finances/${financeId}`, {
    method: "DELETE",
    ...(reason ? { body: { reason } } : {}),
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
