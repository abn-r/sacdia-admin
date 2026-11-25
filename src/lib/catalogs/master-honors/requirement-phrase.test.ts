import { describe, expect, it } from "vitest";

import type { MasterHonorRuleGroupPayload } from "@/lib/api/phase-e-catalogs";

import {
  countActiveGroups,
  describeRequirementGroup,
  type PhraseTranslator,
} from "./requirement-phrase";

// Echo translator: "key|a=1|b=2" so the tests pin both the key and the values.
const t: PhraseTranslator = (key, values) =>
  [key, ...Object.entries(values ?? {}).map(([k, v]) => `${k}=${v}`)].join("|");

const lookups = {
  honorName: (id: number) => ({ 1: "Astronomía", 2: "Astronomía avanzada", 3: "Aves" })[id],
  categoryName: (id: number) => (id === 7 ? "Estudio de la naturaleza" : undefined),
};

const group = (patch: Partial<MasterHonorRuleGroupPayload>): MasterHonorRuleGroupPayload => ({
  group_type: "EXPLICIT_OPTIONS",
  minimum_required: 1,
  display_order: 1,
  options: [],
  ...patch,
});

const option = (label: string, honor_ids: number[] = [], active = true) => ({
  label,
  display_order: 1,
  honor_ids,
  active,
});

describe("describeRequirementGroup", () => {
  it("reads a category group as a count of that category", () => {
    const result = describeRequirementGroup(
      group({ group_type: "CATEGORY_COUNT", minimum_required: 3, honors_category_id: 7 }),
      lookups,
      t,
    );
    expect(result.phrase).toBe("categoryCount|count=3|category=Estudio de la naturaleza");
    expect(result.kind).toBe("kindCategory");
  });

  it("falls back to a generic category when it is unknown", () => {
    const result = describeRequirementGroup(
      group({ group_type: "CATEGORY_COUNT", minimum_required: 2, honors_category_id: 99 }),
      lookups,
      t,
    );
    expect(result.phrase).toBe("categoryCount|count=2|category=anyCategory");
  });

  it("reads one option as is, using honor names when it has no label", () => {
    expect(
      describeRequirementGroup(group({ options: [option("", [1, 2])] }), lookups, t).phrase,
    ).toBe("Astronomía + Astronomía avanzada");
  });

  it("reads 'one of two' as either", () => {
    expect(
      describeRequirementGroup(group({ options: [option("Aves"), option("Insectos")] }), lookups, t)
        .phrase,
    ).toBe("explicitEither|a=Aves|b=Insectos");
  });

  it("reads 'n of many' with the list and 'all' when every option is needed", () => {
    const options = [option("Aves"), option("Mamíferos"), option("Insectos")];
    expect(
      describeRequirementGroup(group({ minimum_required: 2, options }), lookups, t).phrase,
    ).toBe("explicitSome|count=2|list=Aves, Mamíferos, Insectos");
    expect(
      describeRequirementGroup(group({ minimum_required: 3, options }), lookups, t).phrase,
    ).toBe("explicitAll|list=Aves, Mamíferos, Insectos");
  });

  it("ignores inactive options and says so when none are left", () => {
    expect(
      describeRequirementGroup(group({ options: [option("Aves", [], false)] }), lookups, t).phrase,
    ).toBe("explicitEmpty");
  });

  it("passes the option count to the kind line", () => {
    expect(
      describeRequirementGroup(group({ options: [option("A"), option("B"), option("C")] }), lookups, t)
        .kind,
    ).toBe("kindExplicit|count=3");
  });
});

describe("countActiveGroups", () => {
  it("counts only groups that are not deactivated", () => {
    expect(countActiveGroups([group({}), group({ active: false }), group({ active: true })])).toBe(2);
  });
});
