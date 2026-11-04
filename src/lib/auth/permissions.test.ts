import { describe, expect, it } from "vitest";

import { PERMISSION_KEYS } from "./generated/permission-keys";
import * as permissions from "./permissions";

const PERMISSION_SHAPE = /^[a-z_-]+:[a-z_-]+$/;

describe("permissions.ts constants", () => {
  const entries = (Object.entries(permissions) as [string, unknown][]).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && PERMISSION_SHAPE.test(entry[1]),
  );

  it("exports permission constants", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("only names keys present in the generated catalog", () => {
    const known = new Set<string>(PERMISSION_KEYS);
    const missing = entries
      .filter(([, value]) => !known.has(value))
      .map(([name, value]) => `${name} = ${value}`);

    expect(missing).toEqual([]);
  });
});
