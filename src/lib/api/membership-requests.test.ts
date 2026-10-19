import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: vi.fn(),
    apiRequestFromClient: vi.fn(),
  };
});

import { ApiError, apiRequestFromClient } from "@/lib/api/client";
import {
  CONSENT_ERROR_CODES,
  getConsentErrorCode,
  getConsentEvidence,
  toConsentErrorCode,
  uploadConsentEvidence,
  verifyConsent,
} from "./membership-requests";

const mockRequest = vi.mocked(apiRequestFromClient);

describe("membership-requests consent API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads evidence as multipart field `file` to the director endpoint", async () => {
    mockRequest.mockResolvedValue({
      status: "success",
      data: { evidence_id: "e-1", content_type: "application/pdf", size_bytes: 10, uploaded_at: "x" },
    });
    const file = new Blob(["%PDF"], { type: "application/pdf" });

    const result = await uploadConsentEvidence(7, "asg-1", file);

    const [path, options] = mockRequest.mock.calls[0];
    expect(path).toBe("/club-sections/7/membership-requests/asg-1/consent-evidence");
    expect(options?.method).toBe("POST");
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get("file")).toBeInstanceOf(Blob);
    expect(result.evidence_id).toBe("e-1");
  });

  it("reads the signed URL from the envelope", async () => {
    mockRequest.mockResolvedValue({
      status: "success",
      data: { url: "https://signed", expires_in: 900, content_type: "image/png", uploaded_at: "x", uploaded_by_display_name: "Ana" },
    });

    const evidence = await getConsentEvidence(7, "asg-1");

    expect(mockRequest).toHaveBeenCalledWith(
      "/club-sections/7/membership-requests/asg-1/consent-evidence",
    );
    expect(evidence.url).toBe("https://signed");
    expect(evidence.expires_in).toBe(900);
  });

  it("verifyConsent posts the confirmation and normalizes a missing approve_error/assignment", async () => {
    mockRequest.mockResolvedValue({
      status: "success",
      data: { guardianship: { guardianship_id: "g-1", consent_status: "verified" } },
    });

    const result = await verifyConsent(7, "asg-1", {
      confirm_paper_form_reviewed: true,
      approve: true,
    });

    expect(mockRequest).toHaveBeenCalledWith(
      "/club-sections/7/membership-requests/asg-1/verify-consent",
      { method: "POST", body: { confirm_paper_form_reviewed: true, approve: true } },
    );
    expect(result.assignment).toBeNull();
    expect(result.approve_error).toBeNull();
    expect(result.guardianship.consent_status).toBe("verified");
  });

  it("verifyConsent surfaces approve_error from a 200 response", async () => {
    mockRequest.mockResolvedValue({
      status: "success",
      data: {
        guardianship: { guardianship_id: "g-1", consent_status: "verified" },
        assignment: null,
        approve_error: "MR_NOT_FOUND",
      },
    });

    const result = await verifyConsent(7, "asg-1", { confirm_paper_form_reviewed: true });
    expect(result.approve_error).toBe("MR_NOT_FOUND");
  });

  describe("error codes", () => {
    it("reads the top-level `code` only and ignores details", () => {
      const error = new ApiError("x", 409, {
        code: "MR_CONSENT_NOT_VERIFIED",
        details: { code: "GUARDIANSHIP_EVIDENCE_REQUIRED" },
      });
      expect(getConsentErrorCode(error)).toBe("MR_CONSENT_NOT_VERIFIED");
    });

    it("returns null for unknown codes and non-ApiError values", () => {
      expect(getConsentErrorCode(new ApiError("x", 500, { code: "WHATEVER" }))).toBeNull();
      expect(getConsentErrorCode(new Error("x"))).toBeNull();
      expect(getConsentErrorCode(new ApiError("x", 500, null))).toBeNull();
      expect(toConsentErrorCode("")).toBeNull();
      expect(toConsentErrorCode(null)).toBeNull();
      expect(toConsentErrorCode("MR_NOT_FOUND")).toBe("MR_NOT_FOUND");
    });

    it("maps an HTTP 413 without a code (multer limit) to FILE_TOO_LARGE", () => {
      expect(getConsentErrorCode(new ApiError("Payload Too Large", 413, null))).toBe(
        "FILE_TOO_LARGE",
      );
      expect(
        getConsentErrorCode(new ApiError("Payload Too Large", 413, { message: "File too large" })),
      ).toBe("FILE_TOO_LARGE");
      // Non-JSON body (e.g. a proxy HTML/text page).
      expect(getConsentErrorCode(new ApiError("x", 413, "<html>413</html>"))).toBe(
        "FILE_TOO_LARGE",
      );
      // An unrecognised code on a 413 is still a size problem.
      expect(getConsentErrorCode(new ApiError("x", 413, { code: "WHATEVER" }))).toBe(
        "FILE_TOO_LARGE",
      );
    });

    it("keeps a recognised code over the 413 fallback and does not widen other statuses", () => {
      expect(
        getConsentErrorCode(new ApiError("x", 413, { code: "FILE_TYPE_INVALID" })),
      ).toBe("FILE_TYPE_INVALID");
      expect(getConsentErrorCode(new ApiError("x", 400, null))).toBeNull();
      expect(getConsentErrorCode(new ApiError("x", 500, null))).toBeNull();
    });

    it.each(CONSENT_ERROR_CODES)("%s is a recognised consent code", (code) => {
      expect(getConsentErrorCode(new ApiError("x", 400, { code }))).toBe(code);
    });
  });
});
