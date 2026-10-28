import { describe, expect, it } from "vitest";
import { isEmptyOrHttpUrl, optionalText } from "@/lib/activities/helpers";

describe("isEmptyOrHttpUrl", () => {
  it("accepts an empty image because the API treats it as optional", () => {
    expect(isEmptyOrHttpUrl(undefined)).toBe(true);
    expect(isEmptyOrHttpUrl("")).toBe(true);
    expect(isEmptyOrHttpUrl("   ")).toBe(true);
  });

  it("accepts absolute http and https URLs", () => {
    expect(isEmptyOrHttpUrl("https://cdn.example.org/a.png")).toBe(true);
    expect(isEmptyOrHttpUrl("http://example.org/a.png")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isEmptyOrHttpUrl("example.org/a.png")).toBe(false);
    expect(isEmptyOrHttpUrl("ftp://example.org/a.png")).toBe(false);
    expect(isEmptyOrHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("optionalText", () => {
  it("omits empty values and trims the rest", () => {
    expect(optionalText("")).toBeUndefined();
    expect(optionalText("  ")).toBeUndefined();
    expect(optionalText(undefined)).toBeUndefined();
    expect(optionalText(" https://a.b/c.png ")).toBe("https://a.b/c.png");
  });
});
