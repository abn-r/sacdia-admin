import { describe, expect, it } from "vitest";
import { capitalizeFirst } from "./utils";

describe("capitalizeFirst", () => {
  it("uppercases only the first character", () => {
    expect(capitalizeFirst("septiembre de 2026")).toBe("Septiembre de 2026");
  });

  it("keeps connecting words lowercase", () => {
    expect(capitalizeFirst("junio de 2026")).not.toContain(" De ");
  });

  it("handles empty and already capitalized input", () => {
    expect(capitalizeFirst("")).toBe("");
    expect(capitalizeFirst("Julio")).toBe("Julio");
  });
});
