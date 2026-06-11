import { apiRequest, apiRequestFromClient } from "@/lib/api/client";

export type SupportReportStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";
export type SupportReportCategory =
  | "bug"
  | "feature_request"
  | "account"
  | "data_issue"
  | "performance"
  | "other";

export type SupportReportUser = {
  userId: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
};

export type SupportReport = {
  id: string;
  category: SupportReportCategory;
  title: string;
  description: string;
  status: SupportReportStatus;
  user: SupportReportUser;
  deviceInfo: unknown;
  userContext: unknown;
  createdAt: string;
  updatedAt: string;
};

export type SupportReportFilters = {
  status?: SupportReportStatus;
  category?: SupportReportCategory;
  search?: string;
  userId?: string;
  page?: number;
  limit?: number;
};

export type SupportReportsPage = {
  total: number;
  page: number;
  limit: number;
  items: SupportReport[];
};

type SupportReportsEnvelope<T> = {
  status: string;
  data: T;
};

export function buildSupportReportsParams(
  filters: SupportReportFilters,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters.status !== undefined) params.status = filters.status;
  if (filters.category !== undefined) params.category = filters.category;
  if (filters.search !== undefined && filters.search.trim()) {
    params.search = filters.search.trim();
  }
  if (filters.userId !== undefined) params.userId = filters.userId;
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;

  return params;
}

export async function listSupportReports(
  filters: SupportReportFilters,
): Promise<SupportReportsPage> {
  const envelope = await apiRequest<SupportReportsEnvelope<SupportReportsPage>>(
    "/admin/support/reports",
    { params: buildSupportReportsParams(filters), cache: "no-store" },
  );

  return envelope.data;
}

export async function updateSupportReportStatus(
  reportId: string,
  status: SupportReportStatus,
): Promise<SupportReport> {
  const envelope = await apiRequestFromClient<
    SupportReportsEnvelope<SupportReport>
  >(`/admin/support/reports/${encodeURIComponent(reportId)}/status`, {
    method: "PATCH",
    body: { status },
  });

  return envelope.data;
}
