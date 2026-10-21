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
  listCoordinatorConsentPendingFromClient,
  listMembershipRequestsFromClient,
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

    it("recognises the verify-without-approve permission code", () => {
      const error = new ApiError("x", 403, { code: "MR_APPROVE_PERMISSION_REQUIRED" });
      expect(getConsentErrorCode(error)).toBe("MR_APPROVE_PERMISSION_REQUIRED");
      expect(toConsentErrorCode("MR_APPROVE_PERMISSION_REQUIRED")).toBe(
        "MR_APPROVE_PERMISSION_REQUIRED",
      );
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

    it("recognises the out-of-scope code a coordinator gets on a section outside their assignments", () => {
      const error = new ApiError("x", 403, { code: "GUARD_CLUB_SCOPE_REQUIRED" });
      expect(getConsentErrorCode(error)).toBe("GUARD_CLUB_SCOPE_REQUIRED");
    });

    it.each(CONSENT_ERROR_CODES)("%s is a recognised consent code", (code) => {
      expect(getConsentErrorCode(new ApiError("x", 400, { code }))).toBe(code);
    });
  });
});

describe("listMembershipRequestsFromClient (verify verdict)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function item(consent: Record<string, unknown> | null) {
    return {
      assignment_id: "asg-1",
      club_section_id: 7,
      status: "pending",
      created_at: "2026-10-01T00:00:00.000Z",
      consent,
    };
  }

  const baseConsent = {
    required: true,
    dependent: true,
    guardianship_id: "g-1",
    status: "pending",
    evidence_uploaded: true,
    guardians: [],
  };

  async function load(consent: Record<string, unknown> | null) {
    mockRequest.mockResolvedValue({ status: "success", data: [item(consent)] });
    const [first] = await listMembershipRequestsFromClient(7);
    return first.consent;
  }

  it("reads viewer_can_verify and a self_custodian block", async () => {
    const consent = await load({
      ...baseConsent,
      viewer_can_verify: false,
      viewer_verify_block: "self_custodian",
    });
    expect(consent?.viewer_can_verify).toBe(false);
    expect(consent?.viewer_verify_block).toBe("self_custodian");
  });

  it("reads a self_guardian block and a null block", async () => {
    const guardian = await load({
      ...baseConsent,
      viewer_can_verify: false,
      viewer_verify_block: "self_guardian",
    });
    expect(guardian?.viewer_verify_block).toBe("self_guardian");

    const allowed = await load({
      ...baseConsent,
      viewer_can_verify: true,
      viewer_verify_block: null,
    });
    expect(allowed?.viewer_can_verify).toBe(true);
    expect(allowed?.viewer_verify_block).toBeNull();
  });

  it("is backward compatible: absent fields stay undefined", async () => {
    const consent = await load({ ...baseConsent });
    expect(consent?.viewer_can_verify).toBeUndefined();
    expect(consent?.viewer_verify_block).toBeUndefined();
    expect(consent?.guardianship_id).toBe("g-1");
  });

  it("treats an unknown block value as no block", async () => {
    const consent = await load({
      ...baseConsent,
      viewer_can_verify: "yes",
      viewer_verify_block: "something_new",
    });
    expect(consent?.viewer_verify_block).toBeNull();
    expect(consent?.viewer_can_verify).toBeUndefined();
  });

  it("keeps adults (consent null) untouched", async () => {
    expect(await load(null)).toBeNull();
  });
});

describe("listCoordinatorConsentPendingFromClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const consent = {
    required: true,
    dependent: true,
    guardianship_id: "g-1",
    status: "pending",
    evidence_uploaded: true,
    guardians: [],
    viewer_can_verify: true,
    viewer_verify_block: "something_new",
  };

  const item = {
    assignment_id: "asg-1",
    user_id: "u-1",
    club_section_id: 7,
    status: "pending",
    created_at: "2026-10-01T00:00:00.000Z",
    expires_at: null,
    effective_expires_at: "2026-10-31T00:00:00.000Z",
    users: { user_id: "u-1", name: "Ana" },
    roles: { role_id: "r", role_name: "member" },
    consent,
    consent_form_uploaded_at: "2026-10-02T10:00:00.000Z",
    club_name: "Club Águilas",
    club_type_name: "Conquistadores",
    district_name: null,
  };

  it("reads GET /coordination/me/consent-pending with limit and offset and unwraps the envelope", async () => {
    mockRequest.mockResolvedValue({
      status: "success",
      data: {
        items: [item],
        total: 1,
        limit: 25,
        offset: 50,
        by_section: [
          {
            club_section_id: 7,
            club_name: "Club Águilas",
            club_type_name: "Conquistadores",
            district_name: null,
            pending_consent_count: 1,
          },
        ],
      },
    });

    const page = await listCoordinatorConsentPendingFromClient({ limit: 25, offset: 50 });

    expect(mockRequest).toHaveBeenCalledWith("/coordination/me/consent-pending", {
      params: { limit: 25, offset: 50 },
    });
    expect(page.total).toBe(1);
    expect(page.offset).toBe(50);
    expect(page.items[0].club_name).toBe("Club Águilas");
    expect(page.items[0].consent_form_uploaded_at).toBe("2026-10-02T10:00:00.000Z");
    expect(page.by_section[0].pending_consent_count).toBe(1);
  });

  it("normalizes the consent verdict of each item like the per-section list", async () => {
    mockRequest.mockResolvedValue({
      data: { items: [item], total: 1, limit: 25, offset: 0, by_section: [] },
    });

    const page = await listCoordinatorConsentPendingFromClient({ limit: 25, offset: 0 });

    expect(page.items[0].consent?.viewer_verify_block).toBeNull();
  });

  it("tolerates a malformed body: empty page", async () => {
    mockRequest.mockResolvedValue({ data: null });

    const page = await listCoordinatorConsentPendingFromClient({ limit: 25, offset: 0 });

    expect(page).toEqual({ items: [], total: 0, limit: 25, offset: 0, by_section: [] });
  });
});
