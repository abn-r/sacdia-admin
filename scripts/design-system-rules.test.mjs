import { describe, expect, it } from "vitest";
import { RULES } from "./design-system-rules.mjs";

const rule = (id) => {
  const found = RULES.find((r) => r.id === id);
  if (!found) throw new Error(`Rule ${id} not found`);
  return found;
};

describe("uppercase-tracking", () => {
  const r = rule("uppercase-tracking");

  it("flags uppercase combined with tracking on the same line", () => {
    expect(r.test('className="text-xs font-medium uppercase tracking-wider"')).toBe(true);
    expect(r.test('className="tracking-[0.2em] uppercase text-muted-foreground"')).toBe(true);
    expect(r.test('"uppercase tracking-wide"')).toBe(true);
  });

  it("ignores uppercase alone and tracking alone", () => {
    expect(r.test('className="text-[11px] uppercase text-muted-foreground"')).toBe(false);
    expect(r.test('"ml-auto text-xs tracking-widest text-muted-foreground"')).toBe(false);
    expect(r.test('className="font-semibold tracking-tight"')).toBe(false);
  });

  it("allows test files", () => {
    expect(r.allow("src/components/foo.test.tsx")).toBe(true);
    expect(r.allow("src/components/foo.tsx")).toBe(false);
  });

  it("is an error", () => {
    expect(r.severity).toBe("error");
  });
});

describe("pill-radius", () => {
  const r = rule("pill-radius");

  it("flags rounded-4xl and rounded-3xl, including important and variant forms", () => {
    expect(r.test('"inline-flex rounded-4xl border"')).toBe(true);
    expect(r.test('"overflow-hidden rounded-4xl! p-0"')).toBe(true);
    expect(r.test('"before:rounded-4xl before:border"')).toBe(true);
    expect(r.test('"w-fit rounded-3xl border"')).toBe(true);
  });

  it("ignores the radii in the role scale", () => {
    expect(r.test('"rounded-full rounded-2xl rounded-xl rounded-lg rounded-md"')).toBe(false);
  });

  it("is an error", () => {
    expect(r.severity).toBe("error");
  });

  it("allows test files", () => {
    expect(r.allow("src/components/ui/button.test.tsx")).toBe(true);
  });
});

describe("existing rules are preserved", () => {
  it("keeps the previous rule ids", () => {
    const ids = RULES.map((r) => r.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "h1-font-bold",
        "h1-font-semibold",
        "tailwind-palette-bg",
        "tailwind-palette-text",
        "hardcoded-spanish-ui",
      ]),
    );
  });
});
