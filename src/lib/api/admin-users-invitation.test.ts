import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockApiRequest, mockApiRequestFromClient } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
  mockApiRequestFromClient: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...original,
    apiRequest: mockApiRequest,
    apiRequestFromClient: mockApiRequestFromClient,
  };
});

import {
  getAdminUserDetail,
  resendAdminUserInvitationFromClient,
} from "@/lib/api/admin-users";
import { resolveOnboardingMode } from "@/lib/api/post-registration";

describe("admin user detail invitation_pending", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("is true only when the backend says so", async () => {
    mockApiRequest.mockResolvedValueOnce({
      data: { user_id: "u1", invitation_pending: true },
    });
    expect((await getAdminUserDetail("u1")).invitation_pending).toBe(true);
  });

  it("treats a missing field as false", async () => {
    mockApiRequest.mockResolvedValueOnce({ data: { user_id: "u1" } });
    expect((await getAdminUserDetail("u1")).invitation_pending).toBe(false);
  });
});

describe("resendAdminUserInvitationFromClient", () => {
  beforeEach(() => mockApiRequestFromClient.mockReset());

  it("POSTs to the user invitation endpoint", async () => {
    mockApiRequestFromClient.mockResolvedValueOnce({});
    await resendAdminUserInvitationFromClient("a b");
    expect(mockApiRequestFromClient).toHaveBeenCalledWith(
      "/admin/users/a%20b/invitation",
      { method: "POST" },
    );
  });
});

describe("resolveOnboardingMode", () => {
  it("defaults to club when missing or unknown", () => {
    expect(resolveOnboardingMode({})).toBe("club");
    expect(resolveOnboardingMode({ onboarding_mode: "x" as never })).toBe("club");
  });

  it("keeps the known modes", () => {
    expect(resolveOnboardingMode({ onboarding_mode: "club_exempt" })).toBe("club_exempt");
    expect(resolveOnboardingMode({ onboarding_mode: "panel_only" })).toBe("panel_only");
  });
});
