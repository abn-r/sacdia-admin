import { describe, expect, it } from "vitest";
import type { InsuranceOverviewPerson } from "@/lib/api/insurance";
import { groupInsurancePeople, insuranceTabOf, parseInsuranceTab } from "./tabs";

const person = (user_id: string, name: string, status: InsuranceOverviewPerson["status"]): InsuranceOverviewPerson => ({
  user_id,
  name,
  picture: null,
  role_label: null,
  is_staff: false,
  status,
  coverage: null,
  active_order: null,
});

describe("insurance tabs", () => {
  it("maps every status to one tab", () => {
    expect(insuranceTabOf("uninsured")).toBe("uninsured");
    expect(insuranceTabOf("in_order")).toBe("in_process");
    expect(insuranceTabOf("in_review")).toBe("in_process");
    expect(insuranceTabOf("proof_rejected")).toBe("in_process");
    expect(insuranceTabOf("covered")).toBe("covered");
  });

  it("defaults to Sin seguro for unknown values", () => {
    expect(parseInsuranceTab(null)).toBe("uninsured");
    expect(parseInsuranceTab("covered")).toBe("covered");
    expect(parseInsuranceTab("x")).toBe("uninsured");
  });

  it("groups and sorts people by name", () => {
    const groups = groupInsurancePeople([
      person("1", "Zoe", "uninsured"),
      person("2", "Ana", "uninsured"),
      person("3", "Beto", "covered"),
      person("4", "Caro", "in_review"),
    ]);
    expect(groups.uninsured.map((p) => p.name)).toEqual(["Ana", "Zoe"]);
    expect(groups.covered).toHaveLength(1);
    expect(groups.in_process).toHaveLength(1);
  });
});
