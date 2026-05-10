import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn()", () => {
  it("returns a plain string unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple class strings", () => {
    expect(cn("p-2", "m-4")).toBe("p-2 m-4");
  });

  it("ignores falsy values (undefined, null, false)", () => {
    expect(cn("base", undefined, null, false, "extra")).toBe("base extra");
  });

  it("deduplicates conflicting Tailwind utilities keeping the last one", () => {
    // tailwind-merge resolves conflicts: last padding wins
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional class objects", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", { active: isActive, disabled: isDisabled })).toBe(
      "base active",
    );
  });

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });
});
