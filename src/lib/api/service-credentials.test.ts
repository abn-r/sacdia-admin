import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...original, apiRequest: vi.fn() };
});

import { ApiError, apiRequest } from "@/lib/api/client";
import {
  approveServiceCredential,
  getServiceCredentialErrorCode,
  getServiceCredentialReview,
  listServiceCredentialReviews,
  rejectServiceCredential,
} from "@/lib/api/service-credentials";

const mockApiRequest = vi.mocked(apiRequest);

describe("service-credentials API client", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("lists with status, trimmed search and paging, and unwraps the envelope", async () => {
    const page = { items: [], meta: { page: 2, limit: 20, total: 0, counts: { pending: 0, approved: 0, rejected: 0 } } };
    mockApiRequest.mockResolvedValue({ status: "success", data: page });

    const result = await listServiceCredentialReviews({
      status: "APPROVED",
      search: "  ana ",
      page: 2,
      limit: 20,
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/service-credentials/review", {
      params: { status: "APPROVED", search: "ana", page: 2, limit: 20 },
    });
    expect(result).toEqual(page);
  });

  it("omits empty search and unset params", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: {} });
    await listServiceCredentialReviews({ status: "PENDING_REVIEW", search: "   " });
    expect(mockApiRequest).toHaveBeenCalledWith("/service-credentials/review", {
      params: { status: "PENDING_REVIEW" },
    });
  });

  it("gets the detail by id", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { credential_id: "c1" } });
    const result = await getServiceCredentialReview("c1");
    expect(mockApiRequest).toHaveBeenCalledWith("/service-credentials/review/c1");
    expect(result).toEqual({ credential_id: "c1" });
  });

  it("approves with and without expiry", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { credential_id: "c1" } });
    await approveServiceCredential("c1", { expires_at: "2099-01-01" });
    expect(mockApiRequest).toHaveBeenLastCalledWith("/service-credentials/review/c1/approve", {
      method: "POST",
      body: { expires_at: "2099-01-01" },
    });
    await approveServiceCredential("c1");
    expect(mockApiRequest).toHaveBeenLastCalledWith("/service-credentials/review/c1/approve", {
      method: "POST",
      body: {},
    });
  });

  it("rejects with a trimmed reason", async () => {
    mockApiRequest.mockResolvedValue({ status: "success", data: { credential_id: "c1" } });
    await rejectServiceCredential("c1", "  Archivo ilegible  ");
    expect(mockApiRequest).toHaveBeenCalledWith("/service-credentials/review/c1/reject", {
      method: "POST",
      body: { reason: "Archivo ilegible" },
    });
  });

  it("reads the backend error code from flat and nested payloads", () => {
    expect(getServiceCredentialErrorCode(new ApiError("x", 409, { code: "SERVICE_CREDENTIAL_NOT_PENDING" }))).toBe(
      "SERVICE_CREDENTIAL_NOT_PENDING",
    );
    expect(getServiceCredentialErrorCode(new ApiError("x", 404, { error: { code: "SERVICE_CREDENTIAL_NOT_FOUND" } }))).toBe(
      "SERVICE_CREDENTIAL_NOT_FOUND",
    );
    expect(getServiceCredentialErrorCode(new Error("boom"))).toBeNull();
  });
});
