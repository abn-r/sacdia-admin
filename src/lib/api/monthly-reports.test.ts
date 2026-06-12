import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAdminReportsParams,
  downloadMonthlyReportPdf,
  getReportPdfUrl,
} from "./monthly-reports";
import { clearClientAuthTokenCache } from "./client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  clearClientAuthTokenCache();
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("getReportPdfUrl", () => {
  it("keeps UUID report ids intact instead of converting them to NaN", () => {
    const reportId = "46bebcb7-3f0a-49c7-930a-a25efc9bde89";

    expect(getReportPdfUrl(reportId)).toBe(
      "http://localhost:3000/api/v1/monthly-reports/46bebcb7-3f0a-49c7-930a-a25efc9bde89/pdf",
    );
  });

  it("encodes report ids before placing them in the PDF URL path", () => {
    expect(getReportPdfUrl("report id/with slash")).toBe(
      "http://localhost:3000/api/v1/monthly-reports/report%20id%2Fwith%20slash/pdf",
    );
  });

  it("attaches the admin Bearer token when downloading the PDF blob", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "valid-admin-jwt" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("pdf", {
          status: 200,
          headers: { "content-type": "application/pdf" },
        }),
      );

    globalThis.fetch = fetchMock;

    const blob = await downloadMonthlyReportPdf(
      "46bebcb7-3f0a-49c7-930a-a25efc9bde89",
    );

    expect(blob.size).toBe(3);
    expect(blob.type).toBe("application/pdf");

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/token");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/v1/monthly-reports/46bebcb7-3f0a-49c7-930a-a25efc9bde89/pdf",
      {
        headers: {
          Accept: "application/pdf",
          Authorization: "Bearer valid-admin-jwt",
        },
      },
    );
  });
});

describe("buildAdminReportsParams", () => {
  it("maps hierarchy filters to the monthly reports admin query contract", () => {
    expect(
      buildAdminReportsParams({
        divisionId: 1,
        unionId: 2,
        localFieldId: 3,
        clubTypeId: 4,
      }),
    ).toEqual({
      division_id: 1,
      union_id: 2,
      local_field_id: 3,
      club_type_id: 4,
    });
  });
});
