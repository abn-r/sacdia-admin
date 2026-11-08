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

describe("semantic-text-on-solid", () => {
  const r = rule("semantic-text-on-solid");
  it("flags soft semantic bg with white/foreground text", () => {
    expect(r.test('"bg-success text-white"')).toBe(true);
    expect(r.test('"bg-destructive text-destructive-foreground px-2"')).toBe(true);
  });
  it("ignores -solid, opacity and plain usages", () => {
    expect(r.test('"bg-success-solid text-white"')).toBe(false);
    expect(r.test('"bg-success/10 text-white"')).toBe(false);
    expect(r.test('"bg-success text-foreground"')).toBe(false);
  });
});

describe("text size rules", () => {
  const small = rule("text-below-11px");
  const off = rule("off-scale-text");
  it("flags sizes below 11px", () => {
    expect(small.test('"text-[10px]"')).toBe(true);
    expect(small.test('"text-[10.5px]"')).toBe(true);
    expect(small.test('"text-[11px]"')).toBe(false);
  });
  it("flags off-scale sizes", () => {
    expect(off.test('"text-[12px]"')).toBe(true);
    expect(off.test('"text-[13px]"')).toBe(false);
  });
  it("excludes the printable monthly report", () => {
    expect(small.allow("src/components/reports/monthly-report/x.tsx")).toBe(true);
  });
});

describe("window-confirm / pagination / misc", () => {
  it("window-confirm", () => {
    const r = rule("window-confirm");
    expect(r.test("if (!window.confirm(msg)) return;")).toBe(true);
    expect(r.test("if (!confirm(msg)) return;")).toBe(true);
    expect(r.test("async function confirm() {")).toBe(false);
    expect(r.allow("src/a.ts")).toBe(true);
  });
  it("hardcoded-pagination", () => {
    const r = rule("hardcoded-pagination");
    expect(r.test("<Button>Anterior</Button>")).toBe(true);
    expect(r.test("<Button>{t('prev')}</Button>")).toBe(false);
  });
  it("dashed-empty-state gates on file content", () => {
    const r = rule("dashed-empty-state");
    expect(r.fileTest("No hay datos")).toBe(true);
    expect(r.fileTest("No hay datos <EmptyState />")).toBe(false);
  });
  it("color-mix-darkening and side-stripe", () => {
    expect(rule("color-mix-darkening").test("color-mix(in_oklch,var(--success),black_30%)")).toBe(true);
    expect(rule("side-stripe").test('"absolute inset-y-0 left-0 w-1 bg-x"')).toBe(true);
  });
});
