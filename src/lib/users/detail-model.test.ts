import { describe, expect, it } from "vitest";
import type { PostRegistrationStatus } from "@/lib/api/post-registration";
import {
  accessChangeId,
  applicablePostRegistrationSteps,
  availableUserDetailTabs,
  isRiskyAccessChange,
  isStepForceable,
  resolveUserDetailTab,
  summarizePostRegistration,
  toSectionLoad,
} from "./detail-model";

function status(overrides: Partial<PostRegistrationStatus> = {}): PostRegistrationStatus {
  return {
    complete: false,
    steps: { profilePicture: false, personalInfo: false, clubSelection: false },
    nextStep: "profilePicture",
    dateCompleted: null,
    ...overrides,
  };
}

describe("availableUserDetailTabs", () => {
  it("hides health and post-registration without their gates", () => {
    expect(availableUserDetailTabs({ canSeeHealth: false, canSeePostRegistration: false })).toEqual([
      "summary",
      "data",
      "access",
      "honors",
      "classes",
    ]);
  });

  it("shows every tab with every gate", () => {
    expect(
      availableUserDetailTabs({ canSeeHealth: true, canSeePostRegistration: true }),
    ).toEqual(["summary", "data", "health", "access", "honors", "classes", "post-registration"]);
  });
});

describe("resolveUserDetailTab", () => {
  const tabs = availableUserDetailTabs({ canSeeHealth: false, canSeePostRegistration: true });

  it("defaults to the summary", () => {
    expect(resolveUserDetailTab(undefined, tabs)).toBe("summary");
  });

  it("honors a visible tab, including from an array", () => {
    expect(resolveUserDetailTab("access", tabs)).toBe("access");
    expect(resolveUserDetailTab(["post-registration", "x"], tabs)).toBe("post-registration");
  });

  it("a gated or unknown tab falls back instead of widening access", () => {
    expect(resolveUserDetailTab("health", tabs)).toBe("summary");
    expect(resolveUserDetailTab("nope", tabs)).toBe("summary");
  });
});

describe("summarizePostRegistration", () => {
  it("lists what is missing, in step order", () => {
    expect(
      summarizePostRegistration(
        status({ steps: { profilePicture: true, personalInfo: false, clubSelection: false } }),
      ),
    ).toEqual({ state: "pending", missing: ["personalInfo", "clubSelection"] });
  });

  it("is complete when the flag says so, even with stale steps", () => {
    expect(summarizePostRegistration(status({ complete: true }))).toEqual({
      state: "complete",
      missing: [],
    });
  });

  it("club_exempt ignores the club step", () => {
    expect(
      summarizePostRegistration(
        status({
          onboarding_mode: "club_exempt",
          steps: { profilePicture: true, personalInfo: true, clubSelection: false },
        }),
      ),
    ).toEqual({ state: "complete", missing: [] });
  });

  it("panel_only is not applicable and has nothing missing", () => {
    expect(summarizePostRegistration(status({ onboarding_mode: "panel_only" }))).toEqual({
      state: "not_applicable",
      missing: [],
    });
    expect(applicablePostRegistrationSteps("panel_only")).toEqual([]);
  });

  it("only steps 1 and 2 can be forced", () => {
    expect(isStepForceable("profilePicture")).toBe(true);
    expect(isStepForceable("personalInfo")).toBe(true);
    expect(isStepForceable("clubSelection")).toBe(false);
  });
});

describe("access changes", () => {
  it("maps a field and direction to the copy id", () => {
    expect(accessChangeId("access_app", true)).toBe("appOn");
    expect(accessChangeId("access_panel", false)).toBe("panelOff");
    expect(accessChangeId("active", false)).toBe("activeOff");
  });

  it("turning something off is the risky direction", () => {
    expect(isRiskyAccessChange(false)).toBe(true);
    expect(isRiskyAccessChange(true)).toBe(false);
  });
});

describe("toSectionLoad", () => {
  it("keeps a failure distinguishable from an empty value", () => {
    const boom = new Error("x");
    expect(toSectionLoad({ status: "fulfilled", value: [] })).toEqual({ ok: true, value: [] });
    expect(toSectionLoad({ status: "rejected", reason: boom })).toEqual({ ok: false, error: boom });
  });
});
