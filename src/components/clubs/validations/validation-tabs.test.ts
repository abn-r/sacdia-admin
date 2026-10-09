import { describe, expect, it } from "vitest";

import { CLUBS_VALIDATION_TABS, resolveClubsValidationTab } from "./validation-tabs";

describe("clubs validation tabs", () => {
  it("has no class modules tab", () => {
    expect(CLUBS_VALIDATION_TABS).toEqual(["honors", "sections", "certificates"]);
  });

  it("sends old ?tab=modules links to class sections", () => {
    expect(resolveClubsValidationTab("modules")).toBe("sections");
  });

  it("falls back to honors", () => {
    expect(resolveClubsValidationTab(undefined)).toBe("honors");
    expect(resolveClubsValidationTab("nope")).toBe("honors");
    expect(resolveClubsValidationTab("certificates")).toBe("certificates");
  });
});
