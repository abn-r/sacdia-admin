import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiRequestMock, apiRequestFromClientMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  apiRequestFromClientMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  API_BASE_URL: "https://api.test/api/v1",
  apiRequest: apiRequestMock,
  apiRequestFromClient: apiRequestFromClientMock,
  getClientAuthToken: vi.fn(),
}));

import {
  createOrGetDraftReport,
  generateReport,
  listMonthlyReports,
} from "./monthly-reports";

const report = {
  monthly_report_id: "28f20ec9-4f10-4827-b4cd-29ccbc423c34",
  club_enrollment_id: "f7568929-20b6-427a-9b75-08d4a200cdd9",
  month: 7,
  year: 2026,
  status: "draft" as const,
  manual_data: null,
};

describe("monthly reports API adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps and normalizes list responses to the UI report contract", async () => {
    apiRequestMock.mockResolvedValueOnce({ status: "success", data: [report] });

    const result = await listMonthlyReports(report.club_enrollment_id);

    expect(result).toEqual([
      expect.objectContaining({
        report_id: report.monthly_report_id,
        enrollment_id: report.club_enrollment_id,
      }),
    ]);
  });

  it("unwraps and normalizes mutation responses before consumers build action URLs", async () => {
    apiRequestFromClientMock.mockResolvedValueOnce({ status: "success", data: report });

    const result = await createOrGetDraftReport(
      report.club_enrollment_id,
      report.month,
      report.year,
    );

    expect(result.report_id).toBe(report.monthly_report_id);
    expect(result.enrollment_id).toBe(report.club_enrollment_id);
  });

  it("normalizes generated reports returned by the backend envelope", async () => {
    apiRequestFromClientMock.mockResolvedValueOnce({ status: "success", data: report });

    const result = await generateReport(report.monthly_report_id);

    expect(result.report_id).toBe(report.monthly_report_id);
  });
});
