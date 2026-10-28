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

import { getClientAuthToken } from "@/lib/api/client";
import {
  createOrGetDraftReport,
  downloadMonthlyReportPdf,
  filenameFromContentDisposition,
  generateReport,
  listMonthlyReports,
  regenerateReport,
  waitForMonthlyReport,
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
    vi.unstubAllGlobals();
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

    expect(result.queued).toBe(false);
    if (!result.queued) {
      expect(result.report.report_id).toBe(report.monthly_report_id);
    }
  });

  it("treats the 202 queued body as a job instead of an invalid report", async () => {
    apiRequestFromClientMock.mockResolvedValueOnce({
      status: "accepted",
      data: { queued: true, monthly_report_id: report.monthly_report_id, status: "generated" },
    });

    const result = await regenerateReport(report.monthly_report_id);

    expect(result).toEqual({
      queued: true,
      reportId: report.monthly_report_id,
      status: "generated",
    });
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
    expect(result.queued).toBe(false);
    expect(!result.queued && result.report).toEqual(
      expect.objectContaining({
        pdf_r2_key: generated.pdf_r2_key,
        pdf_size_bytes: generated.pdf_size_bytes,
        pdf_sha256: generated.pdf_sha256,
        pdf_generated_at: generated.pdf_generated_at,
        pdf_template_version: generated.pdf_template_version,
      }),
    );
  });

  it("reads the friendly PDF name from Content-Disposition", () => {
    const filename = "informe-mensual-Senderos-Conquistadores-agosto-2026.pdf";

    expect(
      filenameFromContentDisposition(
        `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
        "informe-mensual-fallback.pdf",
      ),
    ).toBe(filename);
  });

  it("ignores an unsafe Content-Disposition filename", () => {
    expect(
      filenameFromContentDisposition(
        'attachment; filename="../../secreto.pdf"',
        "informe-mensual-fallback.pdf",
      ),
    ).toBe("informe-mensual-fallback.pdf");
  });

  it("returns the blob and the header filename together", async () => {
    vi.mocked(getClientAuthToken).mockResolvedValue("token");
    const blob = new Blob(["%PDF"]);
    const filename = "informe-mensual-Senderos-Conquistadores-agosto-2026.pdf";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({
          "Content-Disposition": `attachment; filename="${filename}"`,
        }),
        blob: async () => blob,
      }),
    );

    await expect(downloadMonthlyReportPdf(report.monthly_report_id)).resolves.toEqual({
      blob,
      filename,
    });
  });
});

describe("waitForMonthlyReport", () => {
  const url = `/monthly-reports/${report.monthly_report_id}`;
  beforeEach(() => {
    apiRequestFromClientMock.mockReset();
  });
  const envelope = (pdf: string | null) => ({
    status: "success",
    data: { ...report, status: "generated", pdf_generated_at: pdf },
  });

  it("polls GET until the predicate matches", async () => {
    apiRequestFromClientMock
      .mockResolvedValueOnce(envelope("old"))
      .mockRejectedValueOnce(new Error("blip"))
      .mockResolvedValueOnce(envelope("new"));

    const result = await waitForMonthlyReport(
      report.monthly_report_id,
      (r) => r.pdf_generated_at === "new",
      { intervalMs: 1, timeoutMs: 1000 },
    );

    expect(result?.pdf_generated_at).toBe("new");
    expect(apiRequestFromClientMock).toHaveBeenCalledTimes(3);
    expect(apiRequestFromClientMock).toHaveBeenCalledWith(url);
  });

  it("returns null after the bounded timeout", async () => {
    apiRequestFromClientMock.mockResolvedValue(envelope("old"));

    const result = await waitForMonthlyReport(
      report.monthly_report_id,
      () => false,
      { intervalMs: 5, timeoutMs: 30 },
    );

    expect(result).toBeNull();
  });

  it("stops early when asked to", async () => {
    const result = await waitForMonthlyReport(
      report.monthly_report_id,
      () => false,
      { intervalMs: 1, timeoutMs: 1000, shouldStop: () => true },
    );

    expect(result).toBeNull();
    expect(apiRequestFromClientMock).not.toHaveBeenCalled();
  });
});
