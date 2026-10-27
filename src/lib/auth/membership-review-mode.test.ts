import { describe, expect, it } from "vitest";

import type { AuthUser } from "@/lib/auth/types";
import { canCapability, canViewScreen } from "@/lib/auth/screen-catalog";

import { resolveMembershipReviewMode } from "./membership-review-mode";

function buildUser(roles: string[], permissions: string[]): AuthUser {
  return {
    id: "actor",
    email: "actor@example.com",
    roles,
    authorization: {
      grants: { global_roles: roles.map((role_name) => ({ role_name })) },
      effective: { permissions },
    },
  };
}

describe("requests-membership gating", () => {
  const approver = buildUser(["director"], ["club_members:approve"]);
  const approverWithVerify = buildUser(
    ["director"],
    ["club_members:approve", "consent:verify"],
  );
  const verifyOnly = buildUser(["coordinator"], ["consent:verify"]);
  const nobody = buildUser(["coordinator"], ["clubs:read"]);

  it("opens the page for club_members:approve and for consent:verify alone", () => {
    expect(canViewScreen(approver, "requests-membership")).toBe(true);
    expect(canViewScreen(verifyOnly, "requests-membership")).toBe(true);
  });

  it("keeps the page closed without either permission", () => {
    expect(canViewScreen(nobody, "requests-membership")).toBe(false);
  });

  it("approve/reject capability needs club_members:approve (verify-only has none)", () => {
    expect(canCapability(approver, "requests-membership", "approve")).toBe(true);
    expect(canCapability(verifyOnly, "requests-membership", "approve")).toBe(false);
  });

  it("verifying a consent form is allowed for either permission", () => {
    expect(canCapability(verifyOnly, "requests-membership", "verify_consent")).toBe(true);
    expect(canCapability(approver, "requests-membership", "verify_consent")).toBe(true);
    expect(canCapability(nobody, "requests-membership", "verify_consent")).toBe(false);
  });

  describe("resolveMembershipReviewMode", () => {
    it("approve wins whenever club_members:approve is held", () => {
      expect(resolveMembershipReviewMode(approver)).toBe("approve");
      expect(resolveMembershipReviewMode(approverWithVerify)).toBe("approve");
    });

    it("consent:verify without club_members:approve is verify-only", () => {
      expect(resolveMembershipReviewMode(verifyOnly)).toBe("verify-only");
    });

    it("returns null with neither permission or without a user", () => {
      expect(resolveMembershipReviewMode(nobody)).toBeNull();
      expect(resolveMembershipReviewMode(null)).toBeNull();
    });

    it("super-admin reviews in approve mode", () => {
      expect(resolveMembershipReviewMode(buildUser(["super-admin"], []))).toBe("approve");
    });
  });
});
