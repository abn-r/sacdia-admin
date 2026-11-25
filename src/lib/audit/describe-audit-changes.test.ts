import { describe, expect, it } from "vitest";
import { describeAuditChanges, prettifyChangeField } from "./describe-audit-changes";

const text = (t: string) => ({ kind: "text", text: t });

describe("describeAuditChanges", () => {
  it("reads a per-field diff as changed / added / removed", () => {
    const entries = describeAuditChanges({
      club_name: { from: "Club Águilas", to: "Club Orión" },
      description: { from: null, to: "Nuevo" },
      logo: { from: "a.png", to: null },
      unchanged: { from: "x", to: "x" },
    });
    expect(entries).toEqual([
      { kind: "changed", field: "club_name", from: text("Club Águilas"), to: text("Club Orión") },
      { kind: "added", field: "description", value: text("Nuevo") },
      { kind: "removed", field: "logo", value: text("a.png") },
    ]);
  });

  it("turns list diffs into one added/removed entry per item", () => {
    const entries = describeAuditChanges({
      permissions: { from: ["reports:read", "clubs:read"], to: ["reports:read", "member_of_month:evaluate"] },
    });
    expect(entries).toEqual([
      { kind: "added", field: "permissions", value: text("member_of_month:evaluate") },
      { kind: "removed", field: "permissions", value: text("clubs:read") },
    ]);
  });

  it("supports { added, removed } lists", () => {
    expect(describeAuditChanges({ permissions: { added: ["reports:read"], removed: [] } })).toEqual([
      { kind: "added", field: "permissions", value: text("reports:read") },
    ]);
  });

  it("keeps flat details as plain entries and skips empty ones", () => {
    expect(
      describeAuditChanges({ permission_id: 42, reactivated: false, note: "", ids: [] }),
    ).toEqual([
      { kind: "detail", field: "permission_id", value: text("42") },
      { kind: "detail", field: "reactivated", value: { kind: "bool", value: false } },
    ]);
  });

  it("returns nothing for missing or non-object changes", () => {
    expect(describeAuditChanges(null)).toEqual([]);
    expect(describeAuditChanges("x")).toEqual([]);
    expect(describeAuditChanges([1])).toEqual([]);
  });
});

describe("prettifyChangeField", () => {
  it("makes technical keys readable", () => {
    expect(prettifyChangeField("permission_ids")).toBe("Permission ids");
    expect(prettifyChangeField("memberOfMonth")).toBe("Member of month");
  });
});
