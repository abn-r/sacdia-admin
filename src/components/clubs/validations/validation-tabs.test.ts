import { describe, expect, it } from "vitest";

import {
  availableClassesTabs,
  legacyEvidenceType,
  resolveClassesTab,
  resolveEvidenceTypeFilter,
} from "./validation-tabs";

describe("classes queue tabs", () => {
  it("shows tabs by access", () => {
    expect(availableClassesTabs({ validations: true, proposals: true })).toEqual([
      "pending",
      "evidence",
      "instructors",
      "history",
    ]);
    expect(availableClassesTabs({ validations: true, proposals: false })).toEqual([
      "pending",
      "evidence",
    ]);
    expect(availableClassesTabs({ validations: false, proposals: true })).toEqual([
      "instructors",
      "history",
    ]);
  });

  it("maps legacy tabs to the new ones", () => {
    const all = availableClassesTabs({ validations: true, proposals: true });
    expect(resolveClassesTab("honors", all)).toBe("pending");
    expect(resolveClassesTab("sections", all)).toBe("evidence");
    expect(resolveClassesTab("modules", all)).toBe("evidence");
    expect(legacyEvidenceType("sections")).toBe("class");
    expect(legacyEvidenceType("evidence")).toBeNull();
  });

  it("falls back to the first available tab", () => {
    const proposalsOnly = availableClassesTabs({ validations: false, proposals: true });
    expect(resolveClassesTab(undefined, proposalsOnly)).toBe("instructors");
    expect(resolveClassesTab("pending", proposalsOnly)).toBe("instructors");
    expect(resolveClassesTab("nope", proposalsOnly)).toBe("instructors");
    expect(resolveClassesTab("history", proposalsOnly)).toBe("history");
  });

  it("normalizes the evidence type filter", () => {
    expect(resolveEvidenceTypeFilter("class")).toBe("class");
    expect(resolveEvidenceTypeFilter("x")).toBe("all");
    expect(resolveEvidenceTypeFilter(undefined)).toBe("all");
  });
});
