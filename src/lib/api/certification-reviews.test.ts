import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from "@/lib/api/client";
import {
  approveCloseoutEvidence,
  approveRequirement,
  certify,
  getCloseoutEvidenceDownload,
  getFinalTray,
  getRequirementDetail,
  getRequirementEvidenceDownload,
  getRequirementTray,
  requestCloseoutChanges,
  requestRequirementChanges,
  type RequirementReviewDetail,
  type TrayItem,
} from "@/lib/api/certification-reviews";

const mockApiRequest = vi.mocked(apiRequest);

const STUB_TRAY_ITEM: TrayItem = {
  progress_id: 1000,
  enrollment_id: 42,
  certification_id: 1,
  certification_name: "Capacitación básica",
  module_id: 10,
  module_name: "Módulo 1",
  section_id: 20,
  section_name: "Sección 1",
  status: "SUBMITTED",
  submitted_at: "2026-01-02T00:00:00.000Z",
  participant: {
    user_id: "user-1",
    name: "Ana",
    paternal_last_name: "López",
  },
};

const STUB_DETAIL: RequirementReviewDetail = {
  ...STUB_TRAY_ITEM,
  lock_version: 3,
  components: [],
  history: [],
};

describe("certification-reviews API client", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("getRequirementTray requests the tray with optional status and unwraps data", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [STUB_TRAY_ITEM] });

    const result = await getRequirementTray("SUBMITTED");

    expect(mockApiRequest).toHaveBeenCalledWith("/certifications/reviews/requirements", {
      params: { status: "SUBMITTED" },
    });
    expect(result).toEqual([STUB_TRAY_ITEM]);
  });

  it("getRequirementDetail unwraps the detail envelope", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: STUB_DETAIL });

    const result = await getRequirementDetail(1000);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/certifications/reviews/requirements/1000",
    );
    expect(result).toEqual(STUB_DETAIL);
  });

  it("approveRequirement posts lock_version", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { progress_id: 1000, status: "APPROVED" },
    });

    const result = await approveRequirement(1000, 3);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/certifications/reviews/requirements/1000/approve",
      { method: "POST", body: { lock_version: 3 } },
    );
    expect(result).toEqual({ progress_id: 1000, status: "APPROVED" });
  });

  it("requestRequirementChanges posts lock_version and comment", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: { progress_id: 1000, status: "CHANGES_REQUESTED" },
    });

    await requestRequirementChanges(1000, 3, "Falta evidencia");

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/certifications/reviews/requirements/1000/request-changes",
      {
        method: "POST",
        body: { lock_version: 3, comment: "Falta evidencia" },
      },
    );
  });

  it("getRequirementEvidenceDownload requests the signed URL", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        url: "https://signed.example/a.pdf",
        expires_in: 900,
        original_filename: "a.pdf",
        mime_type: "application/pdf",
      },
    });

    const result = await getRequirementEvidenceDownload(1000, 55);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/certifications/reviews/requirements/1000/evidences/55/download",
    );
    expect(result.url).toBe("https://signed.example/a.pdf");
  });

  it("getFinalTray unwraps closeout tray rows", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: [] });

    await getFinalTray();

    expect(mockApiRequest).toHaveBeenCalledWith("/certifications/reviews/final");
  });

  it("approveCloseoutEvidence / requestCloseoutChanges / certify hit final routes", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { enrollment_id: 42 } });

    await approveCloseoutEvidence(42);
    await requestCloseoutChanges(42, "Corregir firma");
    await certify(42);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "/certifications/reviews/final/42/approve-closeout-evidence",
      { method: "POST" },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/certifications/reviews/final/42/request-changes",
      { method: "POST", body: { comment: "Corregir firma" } },
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "/certifications/reviews/final/42/certify",
      { method: "POST" },
    );
  });

  it("getCloseoutEvidenceDownload requests the signed closeout URL", async () => {
    mockApiRequest.mockResolvedValue({
      status: "success",
      data: {
        url: "https://signed.example/junta.pdf",
        expires_in: 900,
        original_filename: "junta.pdf",
        mime_type: "application/pdf",
      },
    });

    const result = await getCloseoutEvidenceDownload(42);

    expect(mockApiRequest).toHaveBeenCalledWith(
      "/certifications/reviews/final/42/closeout-evidence/download",
    );
    expect(result.original_filename).toBe("junta.pdf");
  });
});
