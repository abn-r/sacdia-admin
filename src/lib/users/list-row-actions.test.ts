import { describe, expect, it } from "vitest";

import { resendInvitationFailure, resolveUserRowActions } from "@/lib/users/list-row-actions";

const all = { canViewDetail: true, canCreate: true, canUpdateAdmin: true };

describe("resolveUserRowActions", () => {
  it("offers everything for an active user with pending post-registration", () => {
    expect(resolveUserRowActions({ active: true, postRegistrationComplete: false }, all)).toEqual({
      view: true,
      resendInvitation: true,
      deactivate: true,
    });
  });

  it("does not offer resend once post-registration is complete", () => {
    expect(resolveUserRowActions({ active: true, postRegistrationComplete: true }, all).resendInvitation).toBe(false);
  });

  it("offers neither resend nor deactivate on an inactive or deleted account", () => {
    for (const user of [{ active: false }, { active: true, isDeleted: true }]) {
      const flags = resolveUserRowActions(user, all);
      expect(flags.resendInvitation).toBe(false);
      expect(flags.deactivate).toBe(false);
    }
  });

  it("follows the actor's capabilities", () => {
    const flags = resolveUserRowActions(
      { active: true, postRegistrationComplete: false },
      { canViewDetail: true, canCreate: false, canUpdateAdmin: false },
    );
    expect(flags).toEqual({ view: true, resendInvitation: false, deactivate: false });
  });
});

describe("resendInvitationFailure", () => {
  it("maps the endpoint's status codes", () => {
    expect(resendInvitationFailure(409)).toBe("alreadyAccepted");
    expect(resendInvitationFailure(429)).toBe("cooldown");
    expect(resendInvitationFailure(503)).toBe("unavailable");
    expect(resendInvitationFailure(403)).toBe("forbidden");
    expect(resendInvitationFailure(404)).toBe("notFound");
    expect(resendInvitationFailure(500)).toBe("generic");
    expect(resendInvitationFailure(undefined)).toBe("generic");
  });
});
