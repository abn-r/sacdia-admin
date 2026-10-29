import { describe, expect, it } from "vitest";
import {
  buildFinanceCategoryExtra,
  parseFinanceCategoryType,
} from "./finance-category-type";

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.append(key, value);
  return fd;
}

describe("parseFinanceCategoryType", () => {
  it("accepts income (0) and expense (1) as strings or numbers", () => {
    expect(parseFinanceCategoryType("0")).toBe(0);
    expect(parseFinanceCategoryType("1")).toBe(1);
    expect(parseFinanceCategoryType(0)).toBe(0);
    expect(parseFinanceCategoryType(1)).toBe(1);
  });

  it("rejects anything else", () => {
    expect(parseFinanceCategoryType("")).toBeNull();
    expect(parseFinanceCategoryType("2")).toBeNull();
    expect(parseFinanceCategoryType("income")).toBeNull();
    expect(parseFinanceCategoryType(null)).toBeNull();
    expect(parseFinanceCategoryType(undefined)).toBeNull();
  });
});

describe("buildFinanceCategoryExtra", () => {
  it("sends type 0 on create (income must not be dropped as falsy)", () => {
    expect(buildFinanceCategoryExtra(form({ type: "0" }), "create")).toEqual({ type: 0 });
  });

  it("sends type 1 on create", () => {
    expect(buildFinanceCategoryExtra(form({ type: "1" }), "create")).toEqual({ type: 1 });
  });

  it("requires the type on create", () => {
    expect(() => buildFinanceCategoryExtra(form({}), "create")).toThrow(/tipo/i);
    expect(() => buildFinanceCategoryExtra(form({ type: "" }), "create")).toThrow(/tipo/i);
  });

  it("sends the type on update when present", () => {
    expect(buildFinanceCategoryExtra(form({ type: "1" }), "update")).toEqual({ type: 1 });
  });

  it("omits the type on update when the field is absent", () => {
    expect(buildFinanceCategoryExtra(form({}), "update")).toEqual({});
  });

  it("rejects an invalid type on update", () => {
    expect(() => buildFinanceCategoryExtra(form({ type: "9" }), "update")).toThrow(/tipo/i);
  });
});
