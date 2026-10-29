import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock, apiRequestFromClientMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  apiRequestFromClientMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "http://api.test/api/v1",
  apiRequest: apiRequestMock,
  apiRequestFromClient: apiRequestFromClientMock,
  getClientAuthToken: vi.fn().mockResolvedValue("jwt"),
}));

import {
  ecclesiasticalYearLabel,
  finalizeAnnualReport,
  formatReportFinalizerName,
  generateAnnualReport,
  generateQuarterlyReport,
  listAdminAnnualReports,
  listAdminQuarterlyReports,
  regenerateQuarterlyReport,
  updateAnnualReportManualData,
} from "./reports";

describe("admin quarterly / annual report client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists quarterly reports with backend query names and drops empty filters", async () => {
    apiRequestMock.mockResolvedValue({
      status: "success",
      data: { total: 1, page: 1, limit: 20, items: [{ quarterly_report_id: 7 }] },
    });

    const page = await listAdminQuarterlyReports({
      clubId: 4,
      year: 2026,
      quarter: undefined,
      status: "draft",
      page: 2,
      limit: 20,
    });

    expect(apiRequestMock).toHaveBeenCalledWith("/admin/quarterly-reports", {
      params: { clubId: 4, year: 2026, status: "draft", page: 2, limit: 20 },
    });
    expect(page.items).toHaveLength(1);
  });

  it("lists annual reports filtered by ecclesiasticalYearId", async () => {
    apiRequestMock.mockResolvedValue({
      status: "success",
      data: { total: 0, page: 1, limit: 20, items: [] },
    });

    await listAdminAnnualReports({ ecclesiasticalYearId: 3 });

    expect(apiRequestMock).toHaveBeenCalledWith("/admin/annual-reports", {
      params: { ecclesiasticalYearId: 3 },
    });
  });

  it("generates a quarterly report with snake_case body", async () => {
    apiRequestFromClientMock.mockResolvedValue({
      status: "success",
      data: { quarterly_report_id: 9 },
    });

    const report = await generateQuarterlyReport({ clubId: 4, year: 2026, quarter: 2 });

    expect(apiRequestFromClientMock).toHaveBeenCalledWith("/admin/quarterly-reports/generate", {
      method: "POST",
      body: { club_id: 4, year: 2026, quarter: 2 },
    });
    expect(report.quarterly_report_id).toBe(9);
  });

  it("generates an annual report with snake_case body", async () => {
    apiRequestFromClientMock.mockResolvedValue({ status: "success", data: { annual_report_id: 2 } });

    await generateAnnualReport({ clubId: 4, ecclesiasticalYearId: 11 });

    expect(apiRequestFromClientMock).toHaveBeenCalledWith("/admin/annual-reports/generate", {
      method: "POST",
      body: { club_id: 4, ecclesiastical_year_id: 11 },
    });
  });

  it("hits the regenerate, finalize and manual-data endpoints", async () => {
    apiRequestFromClientMock.mockResolvedValue({ status: "success", data: {} });

    await regenerateQuarterlyReport(5);
    await finalizeAnnualReport(6);
    await updateAnnualReportManualData(6, { planning_meetings: 3 });

    expect(apiRequestFromClientMock).toHaveBeenNthCalledWith(1, "/admin/quarterly-reports/5/regenerate", {
      method: "POST",
    });
    expect(apiRequestFromClientMock).toHaveBeenNthCalledWith(2, "/admin/annual-reports/6/finalize", {
      method: "POST",
    });
    expect(apiRequestFromClientMock).toHaveBeenNthCalledWith(3, "/admin/annual-reports/6", {
      method: "PATCH",
      body: { planning_meetings: 3 },
    });
  });

  it("builds readable labels", () => {
    expect(ecclesiasticalYearLabel({ start_date: "2025-08-01", end_date: "2026-07-31" })).toBe("2025-2026");
    expect(ecclesiasticalYearLabel({ start_date: "2026-01-01", end_date: "2026-12-31" })).toBe("2026");
    expect(ecclesiasticalYearLabel(null)).toBeNull();
    expect(formatReportFinalizerName({ user_id: "u", name: "Ana", paternal_last_name: "García" })).toBe("Ana García");
    expect(formatReportFinalizerName(null)).toBeNull();
  });
});
