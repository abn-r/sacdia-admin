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
  regenerateReport,
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

  it("calls the dedicated regeneration endpoint and preserves artifact metadata", async () => {
    const generated = {
      ...report,
      status: "generated" as const,
      pdf_r2_key: "2026/07/enrollment/report.pdf",
      pdf_size_bytes: 2048,
      pdf_sha256: "a".repeat(64),
      pdf_generated_at: "2026-08-05T12:00:00.000Z",
      pdf_template_version: "monthly-report-v2-three-page",
    };
    apiRequestFromClientMock.mockResolvedValueOnce({
      status: "success",
      data: generated,
    });

    const result = await regenerateReport(report.monthly_report_id);

    expect(apiRequestFromClientMock).toHaveBeenCalledWith(
      `/monthly-reports/${report.monthly_report_id}/regenerate`,
      { method: "POST" },
    );
    expect(result).toEqual(
      expect.objectContaining({
        pdf_r2_key: generated.pdf_r2_key,
        pdf_size_bytes: generated.pdf_size_bytes,
        pdf_sha256: generated.pdf_sha256,
        pdf_generated_at: generated.pdf_generated_at,
        pdf_template_version: generated.pdf_template_version,
      }),
    );
  });
});
