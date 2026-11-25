import { describe, expect, it } from "vitest";

import type { SystemConfig } from "@/lib/api/system-config";

import {
  controlFor,
  diffVariables,
  groupVariables,
  invalidVariables,
  keyPrefix,
  validateVariable,
} from "./variables";

const cfg = (config_key: string, config_value: string, value_type?: string): SystemConfig => ({
  config_key,
  config_value,
  ...(value_type ? { value_type } : {}),
});

const sample = [
  cfg("investiture.allow_outside_window", "false", "boolean"),
  cfg("investiture.reminder_days", "7", "number"),
  cfg("reports.auto_generate_day", "5", "number"),
  cfg("scoring.weights", '{"a":1}', "json"),
  cfg("maintenance_banner", "", "string"),
];

describe("groupVariables", () => {
  it("groups by key prefix keeping the order", () => {
    const groups = groupVariables(sample);
    expect(groups.map((g) => g.prefix)).toEqual(["investiture", "reports", "scoring", "general"]);
    expect(groups[0]?.configs.map((c) => c.config_key)).toEqual([
      "investiture.allow_outside_window",
      "investiture.reminder_days",
    ]);
  });

  it("puts keys without a dot in the general group", () => {
    expect(keyPrefix("maintenance_banner")).toBe("general");
    expect(keyPrefix(".odd")).toBe("general");
  });
});

describe("controlFor", () => {
  it("maps the value type to a control", () => {
    expect(controlFor("boolean")).toBe("boolean");
    expect(controlFor("number")).toBe("number");
    expect(controlFor("JSON")).toBe("json");
    expect(controlFor("string")).toBe("text");
    expect(controlFor(null)).toBe("text");
    expect(controlFor(undefined)).toBe("text");
    expect(controlFor("something-new")).toBe("text");
  });
});

describe("validateVariable", () => {
  it("validates numbers", () => {
    expect(validateVariable("number", "7")).toBeNull();
    expect(validateVariable("number", "2.5")).toBeNull();
    expect(validateVariable("number", "")).toBe("required");
    expect(validateVariable("number", "siete")).toBe("number");
  });

  it("validates json", () => {
    expect(validateVariable("json", '{"a":[1,2]}')).toBeNull();
    expect(validateVariable("json", "{a:1}")).toBe("json");
    expect(validateVariable("json", "  ")).toBe("required");
  });

  it("requires text and accepts any boolean", () => {
    expect(validateVariable("text", "  ")).toBe("required");
    expect(validateVariable("text", "Mateo")).toBeNull();
    expect(validateVariable("boolean", "true")).toBeNull();
  });
});

describe("diffVariables", () => {
  it("returns only what changed", () => {
    const diff = diffVariables(sample, {
      "investiture.allow_outside_window": "true",
      "investiture.reminder_days": "7",
      "reports.auto_generate_day": "10",
    });
    expect(diff).toEqual([
      { key: "investiture.allow_outside_window", value: "true" },
      { key: "reports.auto_generate_day", value: "10" },
    ]);
  });

  it("is empty when drafts match or are missing", () => {
    expect(diffVariables(sample, {})).toEqual([]);
    expect(diffVariables(sample, { "investiture.reminder_days": "7" })).toEqual([]);
  });
});

describe("invalidVariables", () => {
  it("flags changed drafts that fail their type", () => {
    expect(
      invalidVariables(sample, {
        "investiture.reminder_days": "abc",
        "scoring.weights": "{",
        "reports.auto_generate_day": "9",
      }),
    ).toEqual({ "investiture.reminder_days": "number", "scoring.weights": "json" });
  });
});
