import { describe, expect, it } from "vitest";
import { canPublish, publishReadiness } from "./template-readiness";

describe("publishReadiness", () => {
  it("is ready only when the sections add up exactly", () => {
    const r = publishReadiness(2000, 2000);
    expect(r.state).toBe("ready");
    expect(canPublish(r)).toBe(true);
  });
  it("says how many points are missing", () => {
    const r = publishReadiness(1800, 2000);
    expect(r).toMatchObject({ state: "missing", diff: 200 });
    expect(canPublish(r)).toBe(false);
  });
  it("says how many points are over", () => {
    expect(publishReadiness(2100, 2000)).toMatchObject({ state: "excess", diff: 100 });
  });
  it("cannot publish without a Progreso anual configuration", () => {
    const r = publishReadiness(500, null);
    expect(r.state).toBe("noConfig");
    expect(canPublish(r)).toBe(false);
  });
});
