import { describe, expect, it } from "vitest";
import { flagStatusIntent } from "@/lib/status/flag-status";

describe("flagStatusIntent", () => {
  it("shows an enabled flag (active, access granted, completed) as success", () => {
    expect(flagStatusIntent(true)).toBe("success");
  });

  it("shows a disabled flag as neutral, never as the brand accent", () => {
    expect(flagStatusIntent(false)).toBe("neutral");
  });
});
